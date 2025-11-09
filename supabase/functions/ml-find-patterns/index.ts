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
    const { regionData, similarRegionsData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log('Finding hidden patterns for region:', regionData.region_name);

    const similarRegionsSummary = similarRegionsData?.map((r: any) => ({
      name: r.region_name,
      country: r.country,
      cii: (r.cii_score * 100).toFixed(1),
      climate: (r.climate_risk_score * 100).toFixed(1),
      gdp: r.gdp_per_capita,
      urban: r.urban_population_percent,
    })) || [];

    const prompt = `You are a pattern recognition AI discovering hidden relationships in climate inequality data.

Target Region: ${regionData.region_name}, ${regionData.country}
CII Score: ${(regionData.cii_score * 100).toFixed(1)}%
Climate Risk: ${(regionData.climate_risk_score * 100).toFixed(1)}%
Infrastructure Gap: ${(regionData.infrastructure_score * 100).toFixed(1)}%
Socioeconomic: ${(regionData.socioeconomic_score * 100).toFixed(1)}%
Air Quality PM2.5: ${regionData.air_quality_pm25 || 'N/A'}
GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
Urban Population: ${regionData.urban_population_percent}%
Temperature: ${regionData.temperature_avg}°C
Precipitation: ${regionData.precipitation_avg}mm
Flood Risk: ${(regionData.flood_risk_score * 100).toFixed(1)}%
Drought Index: ${regionData.drought_index}

Similar Regions for Comparison:
${JSON.stringify(similarRegionsSummary, null, 2)}

Discover and explain:
1. Non-obvious correlations between factors (e.g., "High urban % + low precipitation = unusually high infrastructure stress")
2. Cascading vulnerability chains (how one factor amplifies others)
3. Protective factors (what's keeping CII lower than expected given risks)
4. Vulnerability multipliers (factors that compound each other)
5. Comparison insights (patterns visible when compared to similar regions)

Provide 3-5 key pattern discoveries with:
- Pattern Name
- Correlation Strength (Strong/Moderate/Weak)
- Explanation of the relationship
- Actionable insight for policymakers`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert in multivariate pattern recognition and causal inference for climate data." },
          { role: "user", content: prompt }
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
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const patterns = data.choices[0].message.content;

    console.log('Successfully found hidden patterns');

    return new Response(JSON.stringify({ patterns }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ml-find-patterns:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
