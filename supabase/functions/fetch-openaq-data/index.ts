import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Country mapping
const COUNTRIES: Record<string, string> = {
  'DEU': 'Germany',
  'POL': 'Poland',
  'FRA': 'France',
  'ESP': 'Spain',
  'ITA': 'Italy',
  'GRC': 'Greece',
  'ROU': 'Romania',
  'BGR': 'Bulgaria',
  'GBR': 'United Kingdom',
  'NLD': 'Netherlands',
  'SWE': 'Sweden',
  'PRT': 'Portugal',
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
    const { country_codes, days_back = 7 } = await req.json().catch(() => ({ country_codes: null, days_back: 7 }));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const countries = country_codes || Object.keys(COUNTRIES);
    const results: Record<string, any> = {};
    const errors: string[] = [];

    console.log(`Starting OpenAQ data fetch for ${countries.length} countries...`);

    for (const countryCode of countries) {
      try {
        console.log(`Processing ${countryCode}...`);
        
        // Fetch air quality data from OpenAQ
        const airQuality = await fetchCountryAirQuality(countryCode, days_back);
        
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
            .eq('region_code', countryCode);

          if (error) {
            console.error(`Error updating ${countryCode}:`, error);
            errors.push(`${countryCode}: ${error.message}`);
          } else {
            results[countryCode] = {
              success: true,
              pm25: airQuality.avg_pm25,
              no2: airQuality.avg_no2,
              measurements: airQuality.measurement_count
            };
            console.log(`✓ Updated ${countryCode}: PM2.5=${airQuality.avg_pm25?.toFixed(2)}, NO2=${airQuality.avg_no2?.toFixed(2)}`);
          }
        } else {
          results[countryCode] = {
            success: false,
            message: 'No data available'
          };
          console.log(`⚠ No data for ${countryCode}`);
        }
      } catch (error) {
        console.error(`Error processing ${countryCode}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${countryCode}: ${errorMessage}`);
        results[countryCode] = {
          success: false,
          error: errorMessage
        };
      }
    }

    const summary = {
      total: countries.length,
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchCountryAirQuality(countryCode: string, daysBack: number): Promise<AirQualityData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const result: AirQualityData = {
    avg_pm25: null,
    avg_no2: null,
    measurement_count: 0
  };

  // Fetch PM2.5 data
  try {
    const pm25Data = await fetchParameterData(countryCode, 'pm25', startDate, endDate);
    if (pm25Data.length > 0) {
      result.avg_pm25 = calculateAverage(pm25Data);
      result.measurement_count += pm25Data.length;
    }
  } catch (error) {
    console.warn(`PM2.5 fetch failed for ${countryCode}:`, error);
  }

  // Fetch NO2 data
  try {
    const no2Data = await fetchParameterData(countryCode, 'no2', startDate, endDate);
    if (no2Data.length > 0) {
      result.avg_no2 = calculateAverage(no2Data);
      result.measurement_count += no2Data.length;
    }
  } catch (error) {
    console.warn(`NO2 fetch failed for ${countryCode}:`, error);
  }

  return result;
}

async function fetchParameterData(
  countryCode: string,
  parameter: string,
  startDate: Date,
  endDate: Date
): Promise<number[]> {
  const url = new URL('https://api.openaq.org/v2/measurements');
  url.searchParams.set('country', countryCode);
  url.searchParams.set('parameter', parameter);
  url.searchParams.set('date_from', startDate.toISOString().split('T')[0]);
  url.searchParams.set('date_to', endDate.toISOString().split('T')[0]);
  url.searchParams.set('limit', '10000');
  url.searchParams.set('order_by', 'datetime');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json'
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