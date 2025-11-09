import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { regions } = await req.json();

    if (!regions || !Array.isArray(regions) || regions.length < 2 || regions.length > 4) {
      return new Response(
        JSON.stringify({ error: 'Please provide 2-4 regions for comparison' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create a detailed comparison summary
    const comparisonData = regions.map((r: any) => ({
      name: r.region_name,
      country: r.country,
      cii: r.cii_score,
      climate_risk: r.cii_climate_risk_component,
      infrastructure: r.cii_infrastructure_gap_component,
      socioeconomic: r.cii_socioeconomic_vuln_component,
      air_quality: r.cii_air_quality_component,
      population: r.population,
      gdp_per_capita: r.gdp_per_capita,
    }));

    const systemPrompt = `You are a senior comparative climate analyst specializing in regional climate inequality assessments across multiple geographies. Your expertise includes identifying patterns, disparities, and actionable insights from multi-region climate data.

Provide comparative analysis that:
1. **Identifies Key Disparities**: Highlight the most significant differences in climate vulnerability between regions
2. **Root Cause Analysis**: Explain underlying drivers of inequality differences (economic, geographic, infrastructural)
3. **Vulnerable Population Impacts**: Compare which communities face greatest relative risks in each region
4. **Regional Context**: Reference each region's unique characteristics, economic conditions, or recent climate events
5. **Actionable Recommendations**: Provide region-specific priorities while noting opportunities for shared learning

Write in a professional yet accessible tone. Be specific, data-driven, and solution-oriented. Aim for 250-300 words with clear paragraph breaks.`;

    const userPrompt = `Conduct a comprehensive comparative analysis of these ${regions.length} regions:

${comparisonData.map((r: any, i: number) => `
**REGION ${i + 1}: ${r.name}, ${r.country}**
• Climate Inequality Index: ${(r.cii * 100).toFixed(1)}%
• Climate Risk Component: ${(r.climate_risk * 100).toFixed(1)}%
• Infrastructure Gap: ${(r.infrastructure * 100).toFixed(1)}%
• Socioeconomic Vulnerability: ${(r.socioeconomic * 100).toFixed(1)}%
• Air Quality Component: ${(r.air_quality * 100).toFixed(1)}%
• Population: ${r.population?.toLocaleString() || 'N/A'}
• GDP per Capita: $${r.gdp_per_capita?.toFixed(0) || 'N/A'}
`).join('\n')}

Provide a detailed comparative analysis that:

1. **Ranks Vulnerability**: Which region faces the greatest climate inequality challenges and why? What specific combination of factors creates this vulnerability?

2. **Identifies Disparities**: What are the 2-3 most significant differences between these regions? Compare specific metrics (e.g., infrastructure gaps, air quality, economic capacity).

3. **Analyzes Patterns**: Are there common themes or divergent trajectories? Do wealthier regions face different types of climate challenges than poorer ones?

4. **Highlights Strengths**: What does each region do relatively well? Where could regions learn from each other's approaches?

5. **Prioritizes Actions**: What are the top 2-3 priorities for each region based on their unique vulnerability profile?

6. **Provides Context**: Reference each region's economic development level, geographic characteristics, or known climate events to ground the analysis.

Use clear paragraph breaks. Be specific with data comparisons and actionable in recommendations.`;

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
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const insight = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ insight }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in compare-regions function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
