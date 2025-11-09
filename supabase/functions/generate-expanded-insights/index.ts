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
  }).passthrough()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log('Generating expanded insights for:', body.regionData?.region_name || 'Unknown');
    
    let validatedData;
    try {
      validatedData = regionDataSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation failed:', JSON.stringify(validationError.errors, null, 2));
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

    const systemPrompt = `You are a distinguished climate scientist and policy advisor with deep expertise in climate vulnerability, historical climate patterns, and future climate projections. You specialize in creating comprehensive, evidence-based assessments that inform policy decisions.

Your expanded analyses include:
1. **Historical Context**: Multi-decade trends in climate indicators and inequality patterns
2. **Current State Analysis**: Deep dive into present vulnerabilities and their interconnections
3. **Future Projections**: Science-based forecasts for 2030-2050 under current trajectories
4. **Regional Comparisons**: How this region compares to peers and global benchmarks
5. **Policy Pathways**: Detailed, prioritized recommendations with implementation considerations
6. **Vulnerable Communities**: Specific at-risk populations and equity considerations
7. **Economic Implications**: Cost-benefit analysis of inaction vs. intervention

Write in a professional, authoritative tone suitable for policymakers and stakeholders. Be comprehensive yet readable. Target 500-700 words with clear sections and paragraph breaks.`;

    const ciiLevel = regionData.cii_score >= 0.7 ? 'critical' : 
                     regionData.cii_score >= 0.5 ? 'high' : 
                     regionData.cii_score >= 0.3 ? 'moderate' : 'low';
    
    const airQualityStatus = regionData.air_quality_pm25 
      ? (regionData.air_quality_pm25 > 35 ? 'hazardous' : 
         regionData.air_quality_pm25 > 15 ? 'unhealthy' : 
         regionData.air_quality_pm25 > 10 ? 'moderate' : 'good')
      : 'unknown';

    const userPrompt = `Conduct a comprehensive, forward-looking climate inequality assessment for ${regionData.region_name || 'this region'}, ${regionData.country || 'Unknown'}:

**CURRENT STATE (${regionData.data_year || 2024})**
• Climate Inequality Index: ${(regionData.cii_score * 100).toFixed(1)}% (${ciiLevel} severity)
• Climate Risk Component: ${regionData.climate_risk_score ? (regionData.climate_risk_score * 100).toFixed(1) + '%' : 'N/A'}
• Infrastructure Gap: ${regionData.infrastructure_score ? (regionData.infrastructure_score * 100).toFixed(1) + '%' : 'N/A'}
• Socioeconomic Vulnerability: ${regionData.socioeconomic_score ? (regionData.socioeconomic_score * 100).toFixed(1) + '%' : 'N/A'}

**DEMOGRAPHICS & ECONOMY**
• Population: ${regionData.population?.toLocaleString() || 'N/A'}
• GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
• Urban Population: ${regionData.urban_population_percent ? regionData.urban_population_percent.toFixed(1) + '%' : 'N/A'}

**ENVIRONMENTAL INDICATORS**
• Air Quality: ${regionData.air_quality_pm25 ? regionData.air_quality_pm25.toFixed(1) + ' µg/m³ PM2.5 (' + airQualityStatus + ')' : 'N/A'}
• NO₂: ${regionData.air_quality_no2 ? regionData.air_quality_no2.toFixed(1) + ' µg/m³' : 'N/A'}
• Temperature: ${regionData.temperature_avg ? regionData.temperature_avg.toFixed(1) + '°C' : 'N/A'}
• Precipitation: ${regionData.precipitation_avg ? regionData.precipitation_avg.toFixed(0) + ' mm annually' : 'N/A'}
• Drought Risk: ${regionData.drought_index ? (regionData.drought_index * 100).toFixed(0) + '%' : 'N/A'}
• Flood Risk: ${regionData.flood_risk_score ? (regionData.flood_risk_score * 100).toFixed(0) + '%' : 'N/A'}

**DIGITAL INFRASTRUCTURE**
• Internet: ${regionData.internet_speed_download ? regionData.internet_speed_download.toFixed(1) + ' Mbps' : 'N/A'}

Provide a comprehensive report structured as follows:

**1. HISTORICAL CONTEXT & TRENDS (2000-2024)**
Analyze how climate inequality has evolved in ${regionData.country} over the past 20-25 years. Reference known climate events, economic development patterns, and infrastructure investments that shaped current conditions.

**2. CURRENT VULNERABILITY ASSESSMENT**
Deep dive into the present state. What specific combination of factors creates the ${ciiLevel} climate inequality level? How do infrastructure gaps, socioeconomic conditions, and climate hazards interact? Which specific communities (coastal, urban poor, agricultural workers, etc.) face greatest exposure?

**3. FUTURE PROJECTIONS (2030-2050)**
Based on current trends and climate science, project likely scenarios for ${regionData.region_name}:
- How might climate risks intensify (temperature, extreme weather, sea level)?
- What economic and demographic shifts could worsen or improve inequality?
- What's at stake if current trajectories continue?

**4. COMPARATIVE ANALYSIS**
How does ${regionData.region_name} compare to:
- Regional peers in ${regionData.country}?
- Similar regions globally in terms of development level?
- Best and worst-case examples?

**5. STRATEGIC RECOMMENDATIONS**
Provide 4-6 prioritized interventions:
- Immediate actions (0-2 years)
- Medium-term investments (2-5 years)
- Long-term transformation (5-10 years)
Include estimated costs, implementation considerations, and expected impact.

**6. EQUITY & JUSTICE CONSIDERATIONS**
Which vulnerable populations require targeted support? How can interventions ensure equitable outcomes?

Use clear section breaks. Be specific, evidence-based, and solution-oriented. Reference the region's specific context and capacity.`;

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
    const insight = data.choices?.[0]?.message?.content || 'Unable to generate expanded insight.';

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating expanded insight:', error);
    
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
        error: 'An error occurred generating expanded insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
