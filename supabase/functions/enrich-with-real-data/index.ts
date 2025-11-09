import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 20; // Process 20 regions at a time for faster enrichment

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

        // Fetch UN data as backup
        if (!realData.population) {
          const unData = await fetchUNPopulationData(iso2, year);
          if (unData.population) realData.population = unData.population;
        }

        // Fetch OpenAQ air quality
        const airQuality = await fetchOpenAQData(iso2);
        if (airQuality.pm25) realData.air_quality_pm25 = airQuality.pm25;
        if (airQuality.no2) realData.air_quality_no2 = airQuality.no2;

        // Fetch climate data
        const climate = await fetchWorldBankClimate(iso2, year);
        if (climate.precipitation) realData.precipitation_avg = climate.precipitation;

        // Fetch NASA climate data as supplement
        const nasaClimate = await fetchNASAClimateData(iso2, year);
        if (nasaClimate.temperature && !realData.temperature_avg) {
          realData.temperature_avg = nasaClimate.temperature;
        }
        if (nasaClimate.precipitation && !realData.precipitation_avg) {
          realData.precipitation_avg = nasaClimate.precipitation;
        }

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

  const fetchWithRetry = async (url: string, maxRetries = 3): Promise<Response | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (attempt === maxRetries) return null;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  };

  try {
    const popResp = await fetchWithRetry(`${baseUrl}/${iso2}/indicator/SP.POP.TOTL?format=json&date=${year}`);
    if (popResp) {
      const popData = await popResp.json();
      if (popData[1]?.[0]?.value) {
        result.population = Math.round(popData[1][0].value);
      }
    }
  } catch (e) { /* ignore */ }

  try {
    const gdpResp = await fetchWithRetry(`${baseUrl}/${iso2}/indicator/NY.GDP.PCAP.CD?format=json&date=${year}`);
    if (gdpResp) {
      const gdpData = await gdpResp.json();
      if (gdpData[1]?.[0]?.value) {
        result.gdp_per_capita = Math.round(gdpData[1][0].value * 100) / 100;
      }
    }
  } catch (e) { /* ignore */ }

  try {
    const urbanResp = await fetchWithRetry(`${baseUrl}/${iso2}/indicator/SP.URB.TOTL.IN.ZS?format=json&date=${year}`);
    if (urbanResp) {
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

  const fetchWithRetry = async (url: string, headers: any, maxRetries = 3): Promise<Response | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, { headers });
        if (response.ok) return response;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (attempt === maxRetries) return null;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  };

  const fetchParameter = async (parameterId: number) => {
    const url = new URL('https://api.openaq.org/v3/latest');
    url.searchParams.set('countries_id', iso2);
    url.searchParams.set('parameters_id', parameterId.toString());
    url.searchParams.set('limit', '1000');

    const resp = await fetchWithRetry(url.toString(), {
      'Accept': 'application/json',
      'X-API-Key': apiKey || ''
    });

    if (!resp) return null;

    const data = await resp.json();
    if (!data.results || !Array.isArray(data.results)) return null;

    const values = data.results
      .map((r: any) => r.value)
      .filter((v: any) => v !== null && v !== undefined)
      .map((v: any) => Number(v));

    return values.length > 0 ? calculateAverage(values) : null;
  };

  try {
    const pm25 = await fetchParameter(2);
    if (pm25) result.pm25 = Math.round(pm25 * 100) / 100;
  } catch (e) { /* ignore */ }

  try {
    const no2 = await fetchParameter(10);
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

async function fetchUNPopulationData(iso2: string, year: number) {
  const result: { population?: number } = {};
  
  try {
    const unUrl = `https://population.un.org/dataportalapi/api/v1/data/indicators/49/locations/${getUNCountryCode(iso2)}/start/${year}/end/${year}`;
    
    const unResp = await fetch(unUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (unResp.ok) {
      const unData = await unResp.json();
      if (unData.data && unData.data[0] && unData.data[0].value) {
        result.population = Math.round(unData.data[0].value * 1000);
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}

async function fetchNASAClimateData(iso2: string, year: number) {
  const result: { temperature?: number; precipitation?: number } = {};
  
  const fetchWithRetry = async (url: string, maxRetries = 3): Promise<Response | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (attempt === maxRetries) return null;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  };

  try {
    const coords = getCountryCoordinates(iso2);
    if (!coords) return result;

    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/annual/point?parameters=T2M,PRECTOTCORR&community=RE&longitude=${coords.lon}&latitude=${coords.lat}&start=${year}&end=${year}&format=JSON`;
    
    const nasaResp = await fetchWithRetry(nasaUrl);
    
    if (nasaResp) {
      const nasaData = await nasaResp.json();
      if (nasaData.properties && nasaData.properties.parameter) {
        if (nasaData.properties.parameter.T2M && nasaData.properties.parameter.T2M[year]) {
          result.temperature = Math.round(nasaData.properties.parameter.T2M[year] * 100) / 100;
        }
        
        if (nasaData.properties.parameter.PRECTOTCORR && nasaData.properties.parameter.PRECTOTCORR[year]) {
          result.precipitation = Math.round(nasaData.properties.parameter.PRECTOTCORR[year] * 365 * 100) / 100;
        }
      }
    }
  } catch (e) { /* ignore */ }

  return result;
}

function getUNCountryCode(iso2: string): number {
  const mapping: Record<string, number> = {
    'US': 840, 'CN': 156, 'IN': 356, 'BR': 76, 'RU': 643,
    'JP': 392, 'DE': 276, 'GB': 826, 'FR': 250, 'IT': 380,
    'CA': 124, 'AU': 36, 'ES': 724, 'MX': 484, 'KR': 410,
    'BA': 70  // Bosnia and Herzegovina
  };
  
  return mapping[iso2] || 0;
}

function getCountryCoordinates(iso2: string): { lat: number; lon: number } | null {
  const coords: Record<string, { lat: number; lon: number }> = {
    'US': { lat: 37.09, lon: -95.71 },
    'CN': { lat: 35.86, lon: 104.19 },
    'IN': { lat: 20.59, lon: 78.96 },
    'BR': { lat: -14.23, lon: -51.92 },
    'RU': { lat: 61.52, lon: 105.31 },
    'JP': { lat: 36.20, lon: 138.25 },
    'DE': { lat: 51.16, lon: 10.45 },
    'GB': { lat: 55.37, lon: -3.43 },
    'FR': { lat: 46.22, lon: 2.21 },
    'IT': { lat: 41.87, lon: 12.56 },
    'CA': { lat: 56.13, lon: -106.34 },
    'AU': { lat: -25.27, lon: 133.77 },
    'ES': { lat: 40.46, lon: -3.74 },
    'MX': { lat: 23.63, lon: -102.55 },
    'KR': { lat: 35.90, lon: 127.76 },
    'BA': { lat: 43.91, lon: 17.68 }
  };
  
  return coords[iso2] || null;
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
