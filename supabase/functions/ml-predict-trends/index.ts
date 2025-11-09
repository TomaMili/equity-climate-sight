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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log('Generating predictive trends for region:', regionData.region_name);

    const prompt = `You are a climate vulnerability forecasting AI. Analyze the following region data and predict vulnerability trends for 2025-2030.

Region: ${regionData.region_name}, ${regionData.country}
Current Year: ${regionData.data_year}
Current CII Score: ${(regionData.cii_score * 100).toFixed(1)}%
Climate Risk: ${(regionData.climate_risk_score * 100).toFixed(1)}%
Infrastructure Gap: ${(regionData.infrastructure_score * 100).toFixed(1)}%
Socioeconomic Vulnerability: ${(regionData.socioeconomic_score * 100).toFixed(1)}%
Population: ${regionData.population?.toLocaleString() || 'N/A'}
GDP per Capita: $${regionData.gdp_per_capita?.toLocaleString() || 'N/A'}
Temperature Avg: ${regionData.temperature_avg}°C
Precipitation Avg: ${regionData.precipitation_avg}mm

Based on current trends in climate change, infrastructure development, and socioeconomic factors, provide:
1. Predicted CII scores for years 2025-2030 (use realistic incremental changes based on climate acceleration)
2. Key vulnerability factors that will worsen or improve
3. Critical tipping points to watch for
4. Confidence level of predictions (high/medium/low) with reasoning

Format as: Year | Predicted CII | Key Changes | Confidence`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert climate vulnerability analyst using XGBoost-style predictive modeling." },
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
    const prediction = data.choices[0].message.content;

    console.log('Successfully generated predictive trends');

    return new Response(JSON.stringify({ prediction }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ml-predict-trends:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
