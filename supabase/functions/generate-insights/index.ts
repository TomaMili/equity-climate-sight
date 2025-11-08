import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const regionDataSchema = z.object({
  regionData: z.object({
    region_name: z.string().max(200).optional(),
    country: z.string().max(200).optional(),
    cii_score: z.number().min(0).max(1),
    climate_risk_score: z.number().min(0).max(1).optional().nullable(),
    infrastructure_score: z.number().min(0).max(1).optional().nullable(),
    socioeconomic_score: z.number().min(0).max(1).optional().nullable(),
    population: z.number().int().min(0).optional().nullable(),
    air_quality_pm25: z.number().min(0).optional().nullable(),
    internet_connectivity_mbps: z.number().min(0).optional().nullable()
  })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { regionData } = regionDataSchema.parse(body);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert climate and inequality analyst. Provide concise, actionable insights about climate inequality in regions. Focus on:
1. The relationship between climate risk and infrastructure/socioeconomic factors
2. Specific vulnerabilities and their implications
3. Brief recommendations for addressing inequality
Keep responses under 150 words and make them understandable to policymakers.`;

    const userPrompt = `Analyze this region's climate inequality data:
- Region: ${regionData.region_name || 'Unknown'}, ${regionData.country || 'Unknown'}
- Climate Inequality Index: ${regionData.cii_score}
- Climate Risk Score: ${regionData.climate_risk_score || 'N/A'}
- Infrastructure Score: ${regionData.infrastructure_score || 'N/A'}
- Socioeconomic Score: ${regionData.socioeconomic_score || 'N/A'}
- Population: ${regionData.population?.toLocaleString() || 'N/A'}
- Air Quality PM2.5: ${regionData.air_quality_pm25 || 'N/A'}
- Internet Connectivity: ${regionData.internet_connectivity_mbps || 'N/A'} Mbps

Provide a brief, actionable analysis focusing on the key inequality factors and recommendations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || 'Unable to generate insight.';

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating insight:', error);
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid region data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'An error occurred generating insights' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});