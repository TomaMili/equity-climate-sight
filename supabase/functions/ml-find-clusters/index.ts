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
    const { allRegionsData, year } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    console.log(`Finding vulnerability hotspots for ${allRegionsData?.length || 0} regions in ${year}`);

    // Prepare summary statistics
    const summary = allRegionsData.map((r: any) => ({
      name: r.region_name,
      country: r.country,
      cii: (r.cii_score * 100).toFixed(1),
      climate: (r.climate_risk_score * 100).toFixed(1),
      infra: (r.infrastructure_score * 100).toFixed(1),
      socio: (r.socioeconomic_score * 100).toFixed(1),
      pop: r.population,
    })).slice(0, 50); // Limit to top 50 for analysis

    const prompt = `You are a DBSCAN clustering AI identifying vulnerability hotspots. Analyze this climate inequality data.

Year: ${year}
Regions Analyzed: ${summary.length}

Top 50 High-Risk Regions Data:
${JSON.stringify(summary, null, 2)}

Using DBSCAN-style clustering logic:
1. Identify 3-5 major vulnerability hotspot clusters (geographic or thematic)
2. For each cluster, provide:
   - Cluster Name (e.g., "Coastal Southeast Asia Flood Zone")
   - Core Regions (list 3-5 key regions)
   - Shared Characteristics (what makes them cluster together)
   - Total Population Affected (estimate)
   - Primary Vulnerability Driver (climate/infrastructure/socioeconomic)
   - Urgency Level (CRITICAL/HIGH/MEDIUM)

3. Identify outlier regions that don't fit typical patterns
4. Recommend priority cluster for immediate intervention

Focus on actionable geographic clusters with similar vulnerability profiles.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert in spatial clustering and vulnerability hotspot detection using DBSCAN algorithms." },
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
    const clusters = data.choices[0].message.content;

    console.log('Successfully identified vulnerability clusters');

    return new Response(JSON.stringify({ clusters }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ml-find-clusters:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
