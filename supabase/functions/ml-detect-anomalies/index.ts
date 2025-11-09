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
    const { regionData, comparativeData } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

    console.log('Detecting anomalies for region:', regionData.region_name);

    const prompt = `You are an anomaly detection AI analyzing climate-poverty correlations. Identify unusual patterns in this region's data.

Region: ${regionData.region_name}, ${regionData.country}
CII Score: ${(regionData.cii_score * 100).toFixed(1)}%
Climate Risk: ${(regionData.climate_risk_score * 100).toFixed(1)}%
Infrastructure Gap: ${(regionData.infrastructure_score * 100).toFixed(1)}%
Socioeconomic Vulnerability: ${(regionData.socioeconomic_score * 100).toFixed(1)}%
Air Quality PM2.5: ${regionData.air_quality_pm25 || 'N/A'}
GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
Urban Population: ${regionData.urban_population_percent}%
Flood Risk: ${(regionData.flood_risk_score * 100).toFixed(1)}%
Drought Index: ${regionData.drought_index}

${comparativeData ? `Regional Averages for Comparison:
Average CII: ${(comparativeData.avgCII * 100).toFixed(1)}%
Average GDP: $${comparativeData.avgGDP?.toLocaleString()}
Average Urban %: ${comparativeData.avgUrban}%` : ''}

Identify:
1. Unusual climate-poverty correlations (e.g., high GDP but severe climate vulnerability)
2. Unexpected infrastructure gaps given socioeconomic status
3. Anomalous air quality patterns
4. Statistical outliers in component scores
5. Severity: CRITICAL, HIGH, MEDIUM, or LOW

Format each anomaly as:
[SEVERITY] Anomaly Type: Brief description
Impact: Explanation of why this is unusual and concerning
Potential Causes: What might explain this anomaly`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert in statistical anomaly detection for climate inequality data.\n\n${prompt}`
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
    const anomalies = data.candidates[0].content.parts[0].text;

    console.log('Successfully detected anomalies');

    return new Response(JSON.stringify({ anomalies }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ml-detect-anomalies:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
