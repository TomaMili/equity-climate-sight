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

    const systemPrompt = `You are a senior climate equity analyst specializing in regional climate vulnerability assessments. Your expertise spans climate science, infrastructure resilience, socioeconomic factors, and environmental justice.

Analyze regions with depth and nuance, providing:
1. **Root Cause Analysis**: Identify underlying factors driving climate inequality
2. **Local Context**: Reference region-specific climate events, geography, or economic conditions
3. **Vulnerable Populations**: Highlight which communities face greatest risks
4. **Actionable Pathways**: Prioritized recommendations with realistic implementation steps
5. **Regional Comparisons**: Compare to similar regions or regional averages when relevant

Write in a professional yet accessible tone. Be specific and data-driven. Aim for 200-250 words with clear paragraph breaks.`;

    // Calculate severity levels for better context
    const ciiLevel = regionData.cii_score >= 0.7 ? 'critical' : 
                     regionData.cii_score >= 0.5 ? 'high' : 
                     regionData.cii_score >= 0.3 ? 'moderate' : 'low';
    
    const airQualityStatus = regionData.air_quality_pm25 
      ? (regionData.air_quality_pm25 > 35 ? 'hazardous' : 
         regionData.air_quality_pm25 > 15 ? 'unhealthy' : 
         regionData.air_quality_pm25 > 10 ? 'moderate' : 'good')
      : 'unknown';

    const userPrompt = `Conduct a comprehensive climate inequality assessment for ${regionData.region_name || 'this region'}, ${regionData.country || 'Unknown'}:

**CORE METRICS**
• Climate Inequality Index: ${(regionData.cii_score * 100).toFixed(1)}% (${ciiLevel} severity)
• Climate Risk Component: ${regionData.climate_risk_score ? (regionData.climate_risk_score * 100).toFixed(1) + '%' : 'N/A'}
• Infrastructure Gap: ${regionData.infrastructure_score ? (regionData.infrastructure_score * 100).toFixed(1) + '%' : 'N/A'}
• Socioeconomic Vulnerability: ${regionData.socioeconomic_score ? (regionData.socioeconomic_score * 100).toFixed(1) + '%' : 'N/A'}

**DEMOGRAPHICS & ECONOMY**
• Population: ${regionData.population?.toLocaleString() || 'N/A'}
• GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
• Urban Population: ${regionData.urban_population_percent ? regionData.urban_population_percent.toFixed(1) + '%' : 'N/A'}

**ENVIRONMENTAL INDICATORS**
• Air Quality (PM2.5): ${regionData.air_quality_pm25 ? regionData.air_quality_pm25.toFixed(1) + ' µg/m³ (' + airQualityStatus + ')' : 'N/A'}
• NO₂ Pollution: ${regionData.air_quality_no2 ? regionData.air_quality_no2.toFixed(1) + ' µg/m³' : 'N/A'}
• Avg Temperature: ${regionData.temperature_avg ? regionData.temperature_avg.toFixed(1) + '°C' : 'N/A'}
• Annual Precipitation: ${regionData.precipitation_avg ? regionData.precipitation_avg.toFixed(0) + ' mm' : 'N/A'}
• Drought Risk: ${regionData.drought_index ? (regionData.drought_index * 100).toFixed(0) + '%' : 'N/A'}
• Flood Risk: ${regionData.flood_risk_score ? (regionData.flood_risk_score * 100).toFixed(0) + '%' : 'N/A'}

**DIGITAL INFRASTRUCTURE**
• Internet Speed: ${regionData.internet_speed_download ? regionData.internet_speed_download.toFixed(1) + ' Mbps (↓) / ' + (regionData.internet_speed_upload?.toFixed(1) || 'N/A') + ' Mbps (↑)' : 'N/A'}

Provide a detailed, region-specific analysis that:

1. **Interprets the CII Score**: What does this specific score mean for ${regionData.region_name}? Reference the country's geography, economy, or recent climate events if relevant.

2. **Identifies Key Vulnerabilities**: Which 2-3 factors are driving inequality most? Link specific metrics (e.g., air quality, flood risk) to real impacts on residents.

3. **Highlights At-Risk Groups**: Which populations (low-income, coastal, urban poor, etc.) face greatest exposure?

4. **Provides Targeted Recommendations**: Give 3-4 actionable priorities tailored to ${regionData.country}'s context and capacity.

5. **Offers Perspective**: How does this compare to regional peers or what trajectory is this region on?

Use paragraph breaks for readability. Be specific, evidence-based, and solution-oriented.`;

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