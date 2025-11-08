import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RealDataResult {
  region_code: string;
  data: {
    population?: number;
    gdp_per_capita?: number;
    air_quality_pm25?: number;
    air_quality_no2?: number;
    temperature_avg?: number;
    precipitation_avg?: number;
    internet_speed_avg?: number;
    urban_population_percent?: number;
  };
  sources: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { region_code, iso2, data_year } = await req.json();
    
    if (!region_code || !iso2) {
      throw new Error('region_code and iso2 are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching real data for ${region_code} (${iso2}, ${data_year})...`);

    const result: RealDataResult = {
      region_code,
      data: {},
      sources: []
    };

    // Fetch World Bank data (population, GDP, urban %)
    try {
      const worldBankData = await fetchWorldBankData(iso2, data_year);
      if (worldBankData.population) {
        result.data.population = worldBankData.population;
        result.sources.push('World Bank');
      }
      if (worldBankData.gdp_per_capita) {
        result.data.gdp_per_capita = worldBankData.gdp_per_capita;
        result.sources.push('World Bank');
      }
      if (worldBankData.urban_percent) {
        result.data.urban_population_percent = worldBankData.urban_percent;
        result.sources.push('World Bank');
      }
    } catch (error) {
      console.warn(`World Bank fetch failed for ${iso2}:`, error);
    }

    // Fetch UN Population data as backup/supplement
    try {
      const unData = await fetchUNPopulationData(iso2, data_year);
      if (unData.population && !result.data.population) {
        result.data.population = unData.population;
        result.sources.push('UN Data');
      }
    } catch (error) {
      console.warn(`UN Data fetch failed for ${iso2}:`, error);
    }

    // Fetch OpenAQ air quality data
    try {
      const airQuality = await fetchOpenAQData(iso2);
      if (airQuality.pm25) {
        result.data.air_quality_pm25 = airQuality.pm25;
        result.sources.push('OpenAQ');
      }
      if (airQuality.no2) {
        result.data.air_quality_no2 = airQuality.no2;
        result.sources.push('OpenAQ');
      }
    } catch (error) {
      console.warn(`OpenAQ fetch failed for ${iso2}:`, error);
    }

    // Fetch climate data (temperature, precipitation)
    try {
      const climateData = await fetchClimateData(iso2, data_year);
      if (climateData.temperature) {
        result.data.temperature_avg = climateData.temperature;
        result.sources.push('World Bank Climate');
      }
      if (climateData.precipitation) {
        result.data.precipitation_avg = climateData.precipitation;
        result.sources.push('World Bank Climate');
      }
    } catch (error) {
      console.warn(`Climate data fetch failed for ${iso2}:`, error);
    }

    // Fetch NASA climate data as supplement
    try {
      const nasaData = await fetchNASAClimateData(iso2, data_year);
      if (nasaData.temperature && !result.data.temperature_avg) {
        result.data.temperature_avg = nasaData.temperature;
        result.sources.push('NASA POWER');
      }
      if (nasaData.precipitation && !result.data.precipitation_avg) {
        result.data.precipitation_avg = nasaData.precipitation;
        result.sources.push('NASA POWER');
      }
    } catch (error) {
      console.warn(`NASA data fetch failed for ${iso2}:`, error);
    }

    // Fetch internet speed data
    try {
      const internetData = await fetchInternetSpeedData(iso2);
      if (internetData.speed) {
        result.data.internet_speed_avg = internetData.speed;
        result.sources.push('Speedtest Global Index');
      }
    } catch (error) {
      console.warn(`Internet speed fetch failed for ${iso2}:`, error);
    }

    // Update database with real data
    if (Object.keys(result.data).length > 0) {
      const updateData = {
        ...result.data,
        data_sources: Array.from(new Set([...result.sources, 'Natural Earth'])),
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('climate_inequality_regions')
        .update(updateData)
        .eq('region_code', region_code)
        .eq('data_year', data_year);

      if (error) {
        console.error(`Database update failed for ${region_code}:`, error);
        throw error;
      }

      console.log(`✓ Updated ${region_code} with real data from ${result.sources.join(', ')}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching real data:', error);
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
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`World Bank retry ${attempt}/${maxRetries} after ${delay}ms for ${iso2}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`World Bank attempt ${attempt} failed for ${iso2}:`, error);
        if (attempt === maxRetries) return null;
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  };

  try {
    // Fetch population data
    const popResp = await fetchWithRetry(`${baseUrl}/${iso2}/indicator/SP.POP.TOTL?format=json&date=${year}`);
    if (popResp) {
      const popData = await popResp.json();
      if (popData[1]?.[0]?.value) {
        result.population = Math.round(popData[1][0].value);
        console.log(`  Population (${year}): ${result.population.toLocaleString()}`);
      }
    }
  } catch (error) {
    console.error(`[World Bank] Population fetch failed for ${iso2}:`, error);
  }

  try {
    // Fetch GDP per capita data
    const gdpResp = await fetchWithRetry(`${baseUrl}/${iso2}/indicator/NY.GDP.PCAP.CD?format=json&date=${year}`);
    if (gdpResp) {
      const gdpData = await gdpResp.json();
      if (gdpData[1]?.[0]?.value) {
        result.gdp_per_capita = Math.round(gdpData[1][0].value * 100) / 100;
        console.log(`  GDP per capita (${year}): $${result.gdp_per_capita.toLocaleString()}`);
      }
    }
  } catch (error) {
    console.error(`[World Bank] GDP fetch failed for ${iso2}:`, error);
  }

  try {
    // Fetch urban population percentage
    const urbanResp = await fetchWithRetry(`${baseUrl}/${iso2}/indicator/SP.URB.TOTL.IN.ZS?format=json&date=${year}`);
    if (urbanResp) {
      const urbanData = await urbanResp.json();
      if (urbanData[1]?.[0]?.value) {
        result.urban_percent = Math.round(urbanData[1][0].value * 100) / 100;
        console.log(`  Urban population (${year}): ${result.urban_percent}%`);
      }
    }
  } catch (error) {
    console.error(`[World Bank] Urban population fetch failed for ${iso2}:`, error);
  }

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
          console.log(`OpenAQ retry ${attempt}/${maxRetries} after ${delay}ms for ${iso2}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[OpenAQ] Attempt ${attempt} failed for ${iso2}:`, error);
        if (attempt === maxRetries) return null;
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  };

  const fetchParameter = async (parameterId: number, paramName: string) => {
    const url = new URL('https://api.openaq.org/v3/latest');
    url.searchParams.set('countries_id', iso2);
    url.searchParams.set('parameters_id', parameterId.toString());
    url.searchParams.set('limit', '1000');

    const resp = await fetchWithRetry(url.toString(), {
      'Accept': 'application/json',
      'X-API-Key': apiKey || ''
    });

    if (!resp) {
      console.error(`[OpenAQ] ${paramName} fetch failed for ${iso2} after retries`);
      return null;
    }

    const data = await resp.json();
    if (!data.results || !Array.isArray(data.results)) return null;

    const values = data.results
      .map((r: any) => r.value)
      .filter((v: any) => v !== null && v !== undefined)
      .map((v: any) => Number(v));

    return values.length > 0 ? calculateAverage(values) : null;
  };

  try {
    const pm25 = await fetchParameter(2, 'PM2.5');
    if (pm25) {
      result.pm25 = Math.round(pm25 * 100) / 100;
      console.log(`  PM2.5: ${result.pm25} µg/m³`);
    }
  } catch (error) {
    console.error(`[OpenAQ] PM2.5 processing failed for ${iso2}:`, error);
  }

  try {
    const no2 = await fetchParameter(10, 'NO2');
    if (no2) {
      result.no2 = Math.round(no2 * 100) / 100;
      console.log(`  NO2: ${result.no2} µg/m³`);
    }
  } catch (error) {
    console.error(`[OpenAQ] NO2 processing failed for ${iso2}:`, error);
  }

  return result;
}

async function fetchClimateData(iso2: string, year: number) {
  const result: { temperature?: number; precipitation?: number } = {};

  try {
    // Fetch temperature data from World Bank Climate API
    const tempUrl = `https://api.worldbank.org/v2/country/${iso2}/indicator/AG.LND.PRCP.MM?format=json&date=${year}`;
    const tempResp = await fetch(tempUrl);
    
    if (tempResp.ok) {
      const tempData = await tempResp.json();
      if (tempData[1] && tempData[1][0] && tempData[1][0].value) {
        result.precipitation = Math.round(tempData[1][0].value * 100) / 100;
        console.log(`  Precipitation (${year}): ${result.precipitation} mm`);
      }
    }
  } catch (error) {
    console.warn(`Climate data fetch failed for ${iso2}:`, error);
  }

  return result;
}

async function fetchUNPopulationData(iso2: string, year: number) {
  const result: { population?: number } = {};
  
  try {
    // UN Data API - World Population Prospects
    const unUrl = `https://population.un.org/dataportalapi/api/v1/data/indicators/49/locations/${getUNCountryCode(iso2)}/start/${year}/end/${year}`;
    
    const unResp = await fetch(unUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (unResp.ok) {
      const unData = await unResp.json();
      if (unData.data && unData.data[0] && unData.data[0].value) {
        result.population = Math.round(unData.data[0].value * 1000); // UN data is in thousands
        console.log(`  UN Population (${year}): ${result.population.toLocaleString()}`);
      }
    }
  } catch (error) {
    console.warn(`UN population fetch failed for ${iso2}:`, error);
  }

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
          console.log(`NASA retry ${attempt}/${maxRetries} after ${delay}ms for ${iso2}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[NASA] Attempt ${attempt} failed for ${iso2}:`, error);
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
          console.log(`  NASA Temperature (${year}): ${result.temperature}°C`);
        }
        
        if (nasaData.properties.parameter.PRECTOTCORR && nasaData.properties.parameter.PRECTOTCORR[year]) {
          result.precipitation = Math.round(nasaData.properties.parameter.PRECTOTCORR[year] * 365 * 100) / 100;
          console.log(`  NASA Precipitation (${year}): ${result.precipitation} mm`);
        }
      }
    }
  } catch (error) {
    console.error(`[NASA] Climate fetch failed for ${iso2}:`, error);
  }

  return result;
}

async function fetchInternetSpeedData(iso2: string) {
  const result: { speed?: number } = {};
  
  // Note: ITU doesn't provide a free public API for real-time internet speeds
  // This is a placeholder that could be replaced with actual data sources
  // Alternative sources: Speedtest Global Index (Ookla), Cable.co.uk, etc.
  // For now, we'll log that this data source needs manual integration
  
  console.log(`  Internet speed data for ${iso2} requires manual integration from ITU reports`);
  
  return result;
}

function getUNCountryCode(iso2: string): number {
  // Simplified mapping of ISO2 to UN country codes
  // This should be expanded with a complete mapping
  const mapping: Record<string, number> = {
    'US': 840, 'CN': 156, 'IN': 356, 'BR': 76, 'RU': 643,
    'JP': 392, 'DE': 276, 'GB': 826, 'FR': 250, 'IT': 380,
    'CA': 124, 'AU': 36, 'ES': 724, 'MX': 484, 'KR': 410
  };
  
  return mapping[iso2] || 0;
}

function getCountryCoordinates(iso2: string): { lat: number; lon: number } | null {
  // Simplified mapping of ISO2 to country centroids
  // This should be expanded with a complete mapping
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
    'BA': { lat: 43.91, lon: 17.68 } // Bosnia and Herzegovina
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
