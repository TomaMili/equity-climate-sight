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
    const { regionData, successfulRegionsData } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

    console.log('Generating intervention recommendations for region:', regionData.region_name);

    const successCasesSummary = successfulRegionsData?.map((r: any) => ({
      name: r.region_name,
      country: r.country,
      ciiImprovement: r.cii_improvement || 'N/A',
      initialCII: r.initial_cii,
      currentCII: (r.cii_score * 100).toFixed(1),
      keyInterventions: r.key_interventions || 'Infrastructure upgrades, Climate adaptation',
    })) || [];

    const prompt = `You are a recommendation engine AI analyzing successful climate interventions. Based on similar regions' success stories, recommend the top 3 interventions.

Target Region: ${regionData.region_name}, ${regionData.country}
Current CII Score: ${(regionData.cii_score * 100).toFixed(1)}% (${regionData.cii_score >= 0.8 ? 'CRITICAL' : regionData.cii_score >= 0.6 ? 'HIGH' : 'MODERATE'})

Component Breakdown:
- Climate Risk: ${(regionData.climate_risk_score * 100).toFixed(1)}% ⚠️
- Infrastructure Gap: ${(regionData.infrastructure_score * 100).toFixed(1)}% 🏗️
- Socioeconomic: ${(regionData.socioeconomic_score * 100).toFixed(1)}% 👥
- Air Quality: ${regionData.air_quality_pm25 ? regionData.air_quality_pm25 + ' μg/m³' : 'N/A'} 🌫️

Region Characteristics:
- Population: ${regionData.population?.toLocaleString() || 'N/A'}
- GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
- Urban Population: ${regionData.urban_population_percent}%
- Flood Risk: ${(regionData.flood_risk_score * 100).toFixed(1)}%
- Drought Index: ${regionData.drought_index}

Success Stories from Similar Regions:
${successCasesSummary.length > 0 ? JSON.stringify(successCasesSummary, null, 2) : 'No similar success cases available in database'}

Provide TOP 3 RECOMMENDED INTERVENTIONS ranked by:
1. Expected Impact (quantify CII reduction %)
2. Cost-Effectiveness (LOW/MEDIUM/HIGH investment needed)
3. Implementation Timeline (SHORT: <2 years, MEDIUM: 2-5 years, LONG: >5 years)
4. Success Probability based on similar regions (%)

For each recommendation, provide:
- Intervention Name
- Primary Target (which component it addresses most)
- Expected CII Reduction (%)
- Cost Level
- Timeline
- Success Probability (%)
- Key Actions (3-5 specific steps)
- Evidence (cite similar successful regions if available)
- Risk Factors (what could prevent success)

Be specific and actionable. Prioritize interventions that have worked in regions with similar profiles.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert policy advisor specializing in climate adaptation and vulnerability reduction strategies.\n\n${prompt}`
          }]
        }]
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
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const recommendations = data.candidates[0].content.parts[0].text;

    console.log('Successfully generated intervention recommendations');

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ml-recommend-interventions:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
