import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 20; // Process 20 regions at a time

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { year = 2024, region_type = 'country' } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Enriching ${region_type}s for year ${year} with real data...`);

    // Get regions that need enrichment (those with synthetic data)
    const { data: regions, error: fetchError } = await supabase
      .from('climate_inequality_regions')
      .select('region_code, country, data_year')
      .eq('region_type', region_type)
      .eq('data_year', year)
      .contains('data_sources', ['Synthetic'])
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!regions || regions.length === 0) {
      console.log('No regions need enrichment');
      return new Response(
        JSON.stringify({ 
          success: true, 
          complete: true,
          message: 'All regions already enriched' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${regions.length} regions...`);
    let enrichedCount = 0;
    let failedCount = 0;

    for (const region of regions) {
      try {
        // Extract ISO2 code from region_code (e.g., "US-CA" -> "US")
        const iso2 = region.region_code.split('-')[0];
        
        const realData: any = {
          data_sources: ['Natural Earth', 'Real Data'],
          last_updated: new Date().toISOString()
        };

        // Fetch World Bank data
        const worldBank = await fetchWorldBankData(iso2, year);
        if (worldBank.population) realData.population = worldBank.population;
        if (worldBank.gdp_per_capita) realData.gdp_per_capita = worldBank.gdp_per_capita;
        if (worldBank.urban_percent) realData.urban_population_percent = worldBank.urban_percent;

        // Fetch OpenAQ air quality
        const airQuality = await fetchOpenAQData(iso2);
        if (airQuality.pm25) realData.air_quality_pm25 = airQuality.pm25;
        if (airQuality.no2) realData.air_quality_no2 = airQuality.no2;

        // Fetch climate data
        const climate = await fetchWorldBankClimate(iso2, year);
        if (climate.precipitation) realData.precipitation_avg = climate.precipitation;

        // Update the region with real data
        if (Object.keys(realData).length > 2) { // More than just sources and timestamp
          const { error: updateError } = await supabase
            .from('climate_inequality_regions')
            .update(realData)
            .eq('region_code', region.region_code)
            .eq('data_year', year);

          if (updateError) {
            console.error(`Update failed for ${region.region_code}:`, updateError);
            failedCount++;
          } else {
            enrichedCount++;
            console.log(`✓ Enriched ${region.region_code}`);
          }
        } else {
          console.log(`⚠ No real data available for ${region.region_code}`);
        }

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${region.region_code}:`, error);
        failedCount++;
      }
    }

    // Check if more regions need enrichment
    const { count } = await supabase
      .from('climate_inequality_regions')
      .select('region_code', { count: 'exact', head: true })
      .eq('region_type', region_type)
      .eq('data_year', year)
      .contains('data_sources', ['Synthetic']);

    const remaining = (count || 0);
    const isComplete = remaining === 0;

    console.log(`✅ Enriched ${enrichedCount} regions, ${failedCount} failed. ${remaining} remaining.`);

    return new Response(
      JSON.stringify({
        success: true,
        complete: isComplete,
        enriched: enrichedCount,
        failed: failedCount,
        remaining,
        shouldContinue: !isComplete
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchWorldBankData(iso2: string, year: number) {
  const result: { population?: number; gdp_per_capita?: number; urban_percent?: number } = {};
  const baseUrl = 'https://api.worldbank.org/v2/country';

  try {
    // Population
    const popResp = await fetch(`${baseUrl}/${iso2}/indicator/SP.POP.TOTL?format=json&date=${year}`);
    if (popResp.ok) {
      const popData = await popResp.json();
      if (popData[1]?.[0]?.value) {
        result.population = Math.round(popData[1][0].value);
      }
    }
  } catch (e) { /* ignore */ }

  try {
    // GDP per capita
    const gdpResp = await fetch(`${baseUrl}/${iso2}/indicator/NY.GDP.PCAP.CD?format=json&date=${year}`);
    if (gdpResp.ok) {
      const gdpData = await gdpResp.json();
      if (gdpData[1]?.[0]?.value) {
        result.gdp_per_capita = Math.round(gdpData[1][0].value * 100) / 100;
      }
    }
  } catch (e) { /* ignore */ }

  try {
    // Urban population percentage
    const urbanResp = await fetch(`${baseUrl}/${iso2}/indicator/SP.URB.TOTL.IN.ZS?format=json&date=${year}`);
    if (urbanResp.ok) {
      const urbanData = await urbanResp.json();
      if (urbanData[1]?.[0]?.value) {
        result.urban_percent = Math.round(urbanData[1][0].value * 100) / 100;
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}

async function fetchOpenAQData(iso2: string) {
  const result: { pm25?: number; no2?: number } = {};
  const apiKey = Deno.env.get('OPENAQ_API_KEY');

  const fetchParameter = async (parameterId: number) => {
    const url = new URL('https://api.openaq.org/v3/latest');
    url.searchParams.set('countries_id', iso2);
    url.searchParams.set('parameters_id', parameterId.toString());
    url.searchParams.set('limit', '1000');

    const resp = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey || ''
      }
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.results || !Array.isArray(data.results)) return null;

    const values = data.results
      .map((r: any) => r.value)
      .filter((v: any) => v !== null && v !== undefined)
      .map((v: any) => Number(v));

    return values.length > 0 ? calculateAverage(values) : null;
  };

  try {
    const pm25 = await fetchParameter(2); // PM2.5
    if (pm25) result.pm25 = Math.round(pm25 * 100) / 100;
  } catch (e) { /* ignore */ }

  try {
    const no2 = await fetchParameter(10); // NO2
    if (no2) result.no2 = Math.round(no2 * 100) / 100;
  } catch (e) { /* ignore */ }

  return result;
}

async function fetchWorldBankClimate(iso2: string, year: number) {
  const result: { precipitation?: number } = {};

  try {
    // Annual precipitation
    const precipUrl = `https://api.worldbank.org/v2/country/${iso2}/indicator/AG.LND.PRCP.MM?format=json&date=${year}`;
    const precipResp = await fetch(precipUrl);
    
    if (precipResp.ok) {
      const precipData = await precipResp.json();
      if (precipData[1]?.[0]?.value) {
        result.precipitation = Math.round(precipData[1][0].value * 100) / 100;
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sorted.length / 20));
  const trimmed = sorted.length > 10 
    ? sorted.slice(trimCount, -trimCount)
    : sorted;

  if (trimmed.length === 0) return values[0];

  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}
