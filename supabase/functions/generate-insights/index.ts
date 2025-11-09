import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const regionDataSchema = z.object({
  regionData: z.object({
    region_code: z.string().optional(),
    region_name: z.string().max(200).optional(),
    region_type: z.string().optional(),
    country: z.string().max(200).optional(),
    data_year: z.number().int().optional(),
    cii_score: z.number().min(0).max(1),
    climate_risk_score: z.number().min(0).max(1).optional().nullable(),
    infrastructure_score: z.number().min(0).max(1).optional().nullable(),
    socioeconomic_score: z.number().min(0).max(1).optional().nullable(),
    population: z.number().int().min(0).optional().nullable(),
    air_quality_pm25: z.number().min(0).optional().nullable(),
    air_quality_no2: z.number().min(0).optional().nullable(),
    internet_speed_download: z.number().optional().nullable(),
    internet_speed_upload: z.number().optional().nullable(),
    temperature_avg: z.number().optional().nullable(),
    precipitation_avg: z.number().min(0).optional().nullable(),
    drought_index: z.number().min(0).max(1).optional().nullable(),
    flood_risk_score: z.number().min(0).max(1).optional().nullable(),
    gdp_per_capita: z.number().min(0).optional().nullable(),
    urban_population_percent: z.number().min(0).max(100).optional().nullable(),
    data_sources: z.array(z.string()).optional().nullable(),
    last_updated: z.string().optional().nullable(),
  }).passthrough() // Allow additional properties from database
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Log incoming data for debugging (without sensitive info)
    console.log('Received request for region:', body.regionData?.region_name || 'Unknown');
    
    let validatedData;
    try {
      validatedData = regionDataSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation failed:', JSON.stringify(validationError.errors, null, 2));
        console.error('Received data keys:', Object.keys(body.regionData || {}));
        return new Response(
          JSON.stringify({ 
            error: 'Invalid region data provided',
            details: validationError.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw validationError;
    }
    
    const { regionData } = validatedData;
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
- Climate Inequality Index: ${(regionData.cii_score * 100).toFixed(1)}%
- Climate Risk Score: ${regionData.climate_risk_score ? (regionData.climate_risk_score * 100).toFixed(1) + '%' : 'N/A'}
- Infrastructure Score: ${regionData.infrastructure_score ? (regionData.infrastructure_score * 100).toFixed(1) + '%' : 'N/A'}
- Socioeconomic Score: ${regionData.socioeconomic_score ? (regionData.socioeconomic_score * 100).toFixed(1) + '%' : 'N/A'}
- Population: ${regionData.population?.toLocaleString() || 'N/A'}
- GDP per capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
- Air Quality PM2.5: ${regionData.air_quality_pm25 ? regionData.air_quality_pm25.toFixed(1) + ' µg/m³' : 'N/A'}
- NO₂ Levels: ${regionData.air_quality_no2 ? regionData.air_quality_no2.toFixed(1) + ' µg/m³' : 'N/A'}
- Internet Speed (Down): ${regionData.internet_speed_download ? regionData.internet_speed_download.toFixed(1) + ' Mbps' : 'N/A'}
- Average Temperature: ${regionData.temperature_avg ? regionData.temperature_avg.toFixed(1) + '°C' : 'N/A'}
- Annual Precipitation: ${regionData.precipitation_avg ? regionData.precipitation_avg.toFixed(0) + ' mm' : 'N/A'}
- Data Sources: ${regionData.data_sources?.join(', ') || 'Unknown'}

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
    
    // Don't re-catch ZodError since we already handled it above
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid region data provided',
          details: 'Data validation failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred generating insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});