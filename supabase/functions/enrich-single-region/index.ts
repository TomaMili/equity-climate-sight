import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { region_code, year = 2025 } = await req.json();
    
    if (!region_code) {
      throw new Error('region_code is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Enriching single region: ${region_code} (${year})`);

    // Get the region data
    const { data: region, error: fetchError } = await supabase
      .from('climate_inequality_regions')
      .select('region_code, country, data_year, region_type, data_sources')
      .eq('region_code', region_code)
      .eq('data_year', year)
      .single();

    if (fetchError || !region) {
      throw new Error(`Region not found: ${region_code}`);
    }

    // Extract ISO2 code from region_code (e.g., "HR-ZG" -> "HR")
    const iso2 = region.region_code.split('-')[0];
    
    const realData: any = {
      data_sources: ['Natural Earth', 'Real Data'],
      last_updated: new Date().toISOString()
    };

    const sources: string[] = [];

    // Fetch World Bank data
    try {
      const worldBank = await fetchWorldBankData(iso2, year);
      if (worldBank.population && region.region_type === 'country') {
        realData.population = worldBank.population;
        sources.push('World Bank');
      }
      if (worldBank.gdp_per_capita) {
        realData.gdp_per_capita = worldBank.gdp_per_capita;
        if (!sources.includes('World Bank')) sources.push('World Bank');
      }
      if (worldBank.urban_percent) {
        realData.urban_population_percent = worldBank.urban_percent;
        if (!sources.includes('World Bank')) sources.push('World Bank');
      }
    } catch (error) {
      console.warn(`World Bank fetch failed for ${iso2}:`, error);
    }

    // Fetch OpenAQ air quality data
    try {
      const airQuality = await fetchOpenAQData(iso2);
      if (airQuality.pm25) {
        realData.air_quality_pm25 = airQuality.pm25;
        sources.push('OpenAQ');
      }
      if (airQuality.no2) {
        realData.air_quality_no2 = airQuality.no2;
        if (!sources.includes('OpenAQ')) sources.push('OpenAQ');
      }
    } catch (error) {
      console.warn(`OpenAQ fetch failed for ${iso2}:`, error);
    }

    // Fetch NASA climate data
    try {
      const nasaClimate = await fetchNASAClimateData(iso2, year);
      if (nasaClimate.temperature) {
        realData.temperature_avg = nasaClimate.temperature;
        sources.push('NASA POWER');
      }
      if (nasaClimate.precipitation) {
        realData.precipitation_avg = nasaClimate.precipitation;
        if (!sources.includes('NASA POWER')) sources.push('NASA POWER');
      }
    } catch (error) {
      console.warn(`NASA fetch failed for ${iso2}:`, error);
    }

    // Add sources to data_sources array
    if (sources.length > 0) {
      realData.data_sources = ['Natural Earth', 'Real Data', ...sources];
    }

    // Update the region
    const { error: updateError } = await supabase
      .from('climate_inequality_regions')
      .update(realData)
      .eq('region_code', region_code)
      .eq('data_year', year);

    if (updateError) {
      console.error(`Update failed for ${region_code}:`, updateError);
      throw updateError;
    }

    const dataCount = Object.keys(realData).length - 2; // Exclude sources and timestamp
    console.log(`✓ Enriched ${region_code} with ${dataCount} fields from ${sources.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        region_code,
        fields_updated: dataCount,
        sources,
        message: sources.length > 0 
          ? `Successfully enriched with data from ${sources.join(', ')}`
          : 'No additional data available from external sources'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error enriching region:', error);
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
    const popResp = await fetch(`${baseUrl}/${iso2}/indicator/SP.POP.TOTL?format=json&date=${year}`);
    if (popResp.ok) {
      const popData = await popResp.json();
      if (popData[1]?.[0]?.value) {
        result.population = Math.round(popData[1][0].value);
      }
    }
  } catch (error) {
    console.warn(`Population fetch failed for ${iso2}`);
  }

  try {
    const gdpResp = await fetch(`${baseUrl}/${iso2}/indicator/NY.GDP.PCAP.CD?format=json&date=${year}`);
    if (gdpResp.ok) {
      const gdpData = await gdpResp.json();
      if (gdpData[1]?.[0]?.value) {
        result.gdp_per_capita = Math.round(gdpData[1][0].value * 100) / 100;
      }
    }
  } catch (error) {
    console.warn(`GDP fetch failed for ${iso2}`);
  }

  try {
    const urbanResp = await fetch(`${baseUrl}/${iso2}/indicator/SP.URB.TOTL.IN.ZS?format=json&date=${year}`);
    if (urbanResp.ok) {
      const urbanData = await urbanResp.json();
      if (urbanData[1]?.[0]?.value) {
        result.urban_percent = Math.round(urbanData[1][0].value * 100) / 100;
      }
    }
  } catch (error) {
    console.warn(`Urban population fetch failed for ${iso2}`);
  }

  return result;
}

async function fetchOpenAQData(iso2: string) {
  const result: { pm25?: number; no2?: number } = {};
  const apiKey = Deno.env.get('OPENAQ_API_KEY');

  const fetchParameter = async (parameterId: number) => {
    const url = new URL('https://api.openaq.org/v3/latest');
    url.searchParams.set('country', iso2);
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
    const pm25 = await fetchParameter(2);
    if (pm25) {
      result.pm25 = Math.round(pm25 * 100) / 100;
    }
  } catch (error) {
    console.warn(`PM2.5 fetch failed for ${iso2}`);
  }

  try {
    const no2 = await fetchParameter(10);
    if (no2) {
      result.no2 = Math.round(no2 * 100) / 100;
    }
  } catch (error) {
    console.warn(`NO2 fetch failed for ${iso2}`);
  }

  return result;
}

async function fetchNASAClimateData(iso2: string, year: number) {
  const result: { temperature?: number; precipitation?: number } = {};
  
  try {
    const coords = getCountryCoordinates(iso2);
    if (!coords) return result;

    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/annual/point?parameters=T2M,PRECTOTCORR&community=RE&longitude=${coords.lon}&latitude=${coords.lat}&start=${year}&end=${year}&format=JSON`;
    
    const nasaResp = await fetch(nasaUrl);
    
    if (nasaResp.ok) {
      const nasaData = await nasaResp.json();
      if (nasaData.properties?.parameter) {
        if (nasaData.properties.parameter.T2M?.[year]) {
          result.temperature = Math.round(nasaData.properties.parameter.T2M[year] * 100) / 100;
        }
        
        if (nasaData.properties.parameter.PRECTOTCORR?.[year]) {
          result.precipitation = Math.round(nasaData.properties.parameter.PRECTOTCORR[year] * 365 * 100) / 100;
        }
      }
    }
  } catch (error) {
    console.warn(`NASA climate fetch failed for ${iso2}`);
  }

  return result;
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
    'HR': { lat: 45.10, lon: 15.20 }, // Croatia
    'BA': { lat: 43.91, lon: 17.68 }  // Bosnia and Herzegovina
  };
  
  return coords[iso2] || null;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  // Remove outliers - trim top/bottom 5%
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sorted.length / 20));
  const trimmed = sorted.length > 10 
    ? sorted.slice(trimCount, -trimCount)
    : sorted;

  if (trimmed.length === 0) return values[0];

  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}
