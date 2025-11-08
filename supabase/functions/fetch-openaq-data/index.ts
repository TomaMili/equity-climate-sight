import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  country_codes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(50).optional(),
  region_codes: z.array(z.string().max(20)).max(100).optional()
});

// Country mapping with ISO codes
const COUNTRIES: Record<string, string> = {
  'DE': 'Germany',
  'PL': 'Poland',
  'FR': 'France',
  'ES': 'Spain',
  'IT': 'Italy',
  'GR': 'Greece',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'GB': 'United Kingdom',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'PT': 'Portugal',
  'US': 'United States',
  'CA': 'Canada',
  'IN': 'India',
  'CN': 'China',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AU': 'Australia',
  'JP': 'Japan',
};

interface AirQualityData {
  avg_pm25: number | null;
  avg_no2: number | null;
  measurement_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = requestSchema.parse(body);
    const { country_codes, region_codes } = validatedData;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const codes = region_codes || country_codes || Object.keys(COUNTRIES);
    const results: Record<string, any> = {};
    const errors: string[] = [];

    console.log(`Starting OpenAQ v3 data fetch for ${codes.length} regions...`);

    for (const code of codes) {
      try {
        console.log(`Processing ${code}...`);
        
        // Fetch air quality data from OpenAQ v3 API
        const airQuality = await fetchRegionAirQuality(code);
        
        // Update database if we have data
        if (airQuality.avg_pm25 !== null || airQuality.avg_no2 !== null) {
          const updateData: any = {
            last_updated: new Date().toISOString()
          };
          
          if (airQuality.avg_pm25 !== null) {
            updateData.air_quality_pm25 = Number(airQuality.avg_pm25.toFixed(2));
          }
          if (airQuality.avg_no2 !== null) {
            updateData.air_quality_no2 = Number(airQuality.avg_no2.toFixed(2));
          }

          const { error } = await supabase
            .from('climate_inequality_regions')
            .update(updateData)
            .eq('region_code', code);

          if (error) {
            console.error(`Error updating ${code}:`, error);
            errors.push(`${code}: ${error.message}`);
          } else {
            results[code] = {
              success: true,
              pm25: airQuality.avg_pm25,
              no2: airQuality.avg_no2,
              measurements: airQuality.measurement_count
            };
            console.log(`✓ Updated ${code}: PM2.5=${airQuality.avg_pm25?.toFixed(2)}, NO2=${airQuality.avg_no2?.toFixed(2)}`);
          }
        } else {
          results[code] = {
            success: false,
            message: 'No data available'
          };
          console.log(`⚠ No data for ${code}`);
        }
      } catch (error) {
        console.error(`Error processing ${code}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${code}: ${errorMessage}`);
        results[code] = {
          success: false,
          error: errorMessage
        };
      }
    }

    const summary = {
      total: codes.length,
      successful: Object.values(results).filter((r: any) => r.success).length,
      failed: Object.values(results).filter((r: any) => !r.success).length,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({
        summary,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchRegionAirQuality(code: string): Promise<AirQualityData> {
  const result: AirQualityData = {
    avg_pm25: null,
    avg_no2: null,
    measurement_count: 0
  };

  try {
    // Fetch PM2.5 data using v3 API
    const pm25Data = await fetchParameterDataV3(code, 'pm25');
    if (pm25Data.length > 0) {
      result.avg_pm25 = calculateAverage(pm25Data);
      result.measurement_count += pm25Data.length;
    }
  } catch (error) {
    console.warn(`PM2.5 fetch failed for ${code}:`, error);
  }

  try {
    // Fetch NO2 data using v3 API
    const no2Data = await fetchParameterDataV3(code, 'no2');
    if (no2Data.length > 0) {
      result.avg_no2 = calculateAverage(no2Data);
      result.measurement_count += no2Data.length;
    }
  } catch (error) {
    console.warn(`NO2 fetch failed for ${code}:`, error);
  }

  return result;
}

async function fetchParameterDataV3(
  code: string,
  parameterId: string
): Promise<number[]> {
  // OpenAQ v3 API uses different parameter IDs
  const parameterMap: Record<string, number> = {
    'pm25': 2,  // PM2.5
    'no2': 10   // NO2
  };

  const url = new URL('https://api.openaq.org/v3/latest');
  url.searchParams.set('countries_id', code);
  url.searchParams.set('parameters_id', parameterMap[parameterId].toString());
  url.searchParams.set('limit', '1000');

  const apiKey = Deno.env.get('OPENAQ_API_KEY');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': apiKey || ''
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAQ API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const measurements: number[] = [];

  if (data.results && Array.isArray(data.results)) {
    for (const result of data.results) {
      if (result.value !== null && result.value !== undefined) {
        measurements.push(Number(result.value));
      }
    }
  }

  return measurements;
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;

  // Remove outliers - trim top/bottom 5%
  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sorted.length / 20));
  const trimmed = sorted.length > 10 
    ? sorted.slice(trimCount, -trimCount)
    : sorted;

  if (trimmed.length === 0) return null;

  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}
