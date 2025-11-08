import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regionData } = await req.json();
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});