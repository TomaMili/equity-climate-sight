import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 100; // Process 100 regions at a time

/**
 * Compute Climate Inequality Index from real metrics
 * 
 * CII Formula (0-1 scale, higher = worse inequality):
 * - Climate Risk (30%): Temperature extremes, precipitation, drought/flood risk
 * - Infrastructure Gap (25%): Inverse of infrastructure score
 * - Socioeconomic Vulnerability (25%): GDP per capita, urban %, population density
 * - Air Quality (20%): PM2.5 and NO2 levels
 * 
 * Each component is normalized to 0-1 scale where 1 = worst inequality
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { year = 2024, region_type } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Computing CII for ${region_type || 'all'} regions in year ${year}...`);

    // Fetch regions with real data (not synthetic)
    let query = supabase
      .from('climate_inequality_regions')
      .select('*')
      .eq('data_year', year)
      .not('data_sources', 'cs', '["Synthetic"]'); // Exclude purely synthetic data

    if (region_type) {
      query = query.eq('region_type', region_type);
    }

    const { data: regions, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!regions || regions.length === 0) {
      console.log('No regions with real data found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No regions with real data to compute CII for',
          computed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${regions.length} regions...`);
    
    let computedCount = 0;
    let skippedCount = 0;

    // Process in batches
    for (let i = 0; i < regions.length; i += BATCH_SIZE) {
      const batch = regions.slice(i, i + BATCH_SIZE);
      
      for (const region of batch) {
        try {
          const cii = computeCII(region);
          
          if (cii === null) {
            skippedCount++;
            console.log(`⚠ Skipped ${region.region_code}: insufficient data`);
            continue;
          }

          // Get component breakdown
          const breakdown = getComponentBreakdown(region);
          
          // Update CII and component scores in database
          const { error: updateError } = await supabase
            .from('climate_inequality_regions')
            .update({ 
              cii_score: cii,
              cii_climate_risk_component: breakdown.climateRisk,
              cii_infrastructure_gap_component: breakdown.infrastructureGap,
              cii_socioeconomic_vuln_component: breakdown.socioeconomicVuln,
              cii_air_quality_component: breakdown.airQuality,
              last_updated: new Date().toISOString()
            })
            .eq('region_code', region.region_code)
            .eq('data_year', year);

          if (updateError) {
            console.error(`Error updating ${region.region_code}:`, updateError);
          } else {
            computedCount++;
            if (computedCount % 50 === 0) {
              console.log(`Processed ${computedCount}/${regions.length} regions...`);
            }
          }
        } catch (error) {
          console.error(`Error processing ${region.region_code}:`, error);
        }
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ CII computation complete: ${computedCount} computed, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        computed: computedCount,
        skipped: skippedCount,
        total: regions.length,
        message: `CII computed for ${computedCount} regions`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Compute CII from region metrics
 * Returns null if insufficient data available
 */
function computeCII(region: any): number | null {
  const components: { score: number; weight: number; available: boolean }[] = [];

  // 1. Climate Risk Component (30%)
  const climateRisk = computeClimateRisk(region);
  if (climateRisk !== null) {
    components.push({ score: climateRisk, weight: 0.30, available: true });
  }

  // 2. Infrastructure Gap Component (25%)
  const infrastructureGap = computeInfrastructureGap(region);
  if (infrastructureGap !== null) {
    components.push({ score: infrastructureGap, weight: 0.25, available: true });
  }

  // 3. Socioeconomic Vulnerability Component (25%)
  const socioeconomicVuln = computeSocioeconomicVulnerability(region);
  if (socioeconomicVuln !== null) {
    components.push({ score: socioeconomicVuln, weight: 0.25, available: true });
  }

  // 4. Air Quality Component (20%)
  const airQuality = computeAirQualityScore(region);
  if (airQuality !== null) {
    components.push({ score: airQuality, weight: 0.20, available: true });
  }

  // Require at least 2 components to compute CII
  if (components.length < 2) {
    return null;
  }

  // Normalize weights for available components
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  
  // Compute weighted average
  const cii = components.reduce((sum, c) => {
    const normalizedWeight = c.weight / totalWeight;
    return sum + (c.score * normalizedWeight);
  }, 0);

  return Math.max(0, Math.min(1, cii)); // Clamp to [0, 1]
}

/**
 * Compute climate risk score (0-1, higher = worse)
 * Based on temperature extremes, precipitation patterns, drought/flood risk
 */
function computeClimateRisk(region: any): number | null {
  const factors: number[] = [];

  // Temperature risk (extreme heat)
  if (region.temperature_avg !== null && region.temperature_avg !== undefined) {
    // Normalize temperature: 0°C = 0, 40°C+ = 1
    const tempRisk = Math.max(0, Math.min(1, region.temperature_avg / 40));
    factors.push(tempRisk);
  }

  // Drought risk
  if (region.drought_index !== null && region.drought_index !== undefined) {
    factors.push(region.drought_index);
  }

  // Flood risk
  if (region.flood_risk_score !== null && region.flood_risk_score !== undefined) {
    factors.push(region.flood_risk_score);
  }

  // Precipitation extremes (both too low and too high are risky)
  if (region.precipitation_avg !== null && region.precipitation_avg !== undefined) {
    // Optimal range: 800-2000mm/year
    // < 400mm = drought risk, > 3000mm = flood risk
    let precipRisk = 0;
    if (region.precipitation_avg < 400) {
      precipRisk = 1 - (region.precipitation_avg / 400);
    } else if (region.precipitation_avg > 3000) {
      precipRisk = Math.min(1, (region.precipitation_avg - 3000) / 3000);
    } else if (region.precipitation_avg < 800) {
      precipRisk = 0.3 * (800 - region.precipitation_avg) / 400;
    } else if (region.precipitation_avg > 2000) {
      precipRisk = 0.3 * (region.precipitation_avg - 2000) / 1000;
    }
    factors.push(precipRisk);
  }

  // Use existing climate_risk_score if available
  if (region.climate_risk_score !== null && region.climate_risk_score !== undefined) {
    factors.push(region.climate_risk_score);
  }

  return factors.length > 0 
    ? factors.reduce((sum, f) => sum + f, 0) / factors.length 
    : null;
}

/**
 * Compute infrastructure gap score (0-1, higher = worse gap)
 * Inverse of infrastructure quality
 */
function computeInfrastructureGap(region: any): number | null {
  const factors: number[] = [];

  // Use existing infrastructure score (inverse it - low score = high gap)
  if (region.infrastructure_score !== null && region.infrastructure_score !== undefined) {
    factors.push(1 - region.infrastructure_score);
  }

  // Internet connectivity gap (low speed = high gap)
  if (region.internet_speed_download !== null && region.internet_speed_download !== undefined) {
    // < 10 Mbps = severe gap, > 100 Mbps = no gap
    const speedGap = 1 - Math.min(1, region.internet_speed_download / 100);
    factors.push(speedGap);
  }

  return factors.length > 0 
    ? factors.reduce((sum, f) => sum + f, 0) / factors.length 
    : null;
}

/**
 * Compute socioeconomic vulnerability score (0-1, higher = more vulnerable)
 * Based on GDP per capita, urbanization, population density
 */
function computeSocioeconomicVulnerability(region: any): number | null {
  const factors: number[] = [];

  // Use existing socioeconomic score
  if (region.socioeconomic_score !== null && region.socioeconomic_score !== undefined) {
    factors.push(region.socioeconomic_score);
  }

  // GDP per capita vulnerability (lower GDP = higher vulnerability)
  if (region.gdp_per_capita !== null && region.gdp_per_capita !== undefined) {
    // < $5,000 = high vuln, > $50,000 = low vuln
    const gdpVuln = 1 - Math.min(1, region.gdp_per_capita / 50000);
    factors.push(gdpVuln);
  }

  // Urban population (low urbanization can indicate limited services)
  if (region.urban_population_percent !== null && region.urban_population_percent !== undefined) {
    // < 30% urban = higher vulnerability due to limited services
    // > 80% urban = potential overcrowding vulnerability
    let urbanVuln = 0;
    if (region.urban_population_percent < 30) {
      urbanVuln = 0.5 * (1 - region.urban_population_percent / 30);
    } else if (region.urban_population_percent > 80) {
      urbanVuln = 0.3 * ((region.urban_population_percent - 80) / 20);
    }
    factors.push(urbanVuln);
  }

  return factors.length > 0 
    ? factors.reduce((sum, f) => sum + f, 0) / factors.length 
    : null;
}

/**
 * Compute air quality score (0-1, higher = worse quality)
 * Based on PM2.5 and NO2 levels
 */
function computeAirQualityScore(region: any): number | null {
  const factors: number[] = [];

  // PM2.5 pollution (WHO guideline: 5 µg/m³, dangerous: 35+ µg/m³)
  if (region.air_quality_pm25 !== null && region.air_quality_pm25 !== undefined) {
    const pm25Risk = Math.min(1, region.air_quality_pm25 / 35);
    factors.push(pm25Risk);
  }

  // NO2 pollution (WHO guideline: 10 µg/m³, dangerous: 40+ µg/m³)
  if (region.air_quality_no2 !== null && region.air_quality_no2 !== undefined) {
    const no2Risk = Math.min(1, region.air_quality_no2 / 40);
    factors.push(no2Risk);
  }

  return factors.length > 0 
    ? factors.reduce((sum, f) => sum + f, 0) / factors.length 
    : null;
}

/**
 * Get component breakdown for a region
 * Returns individual component scores (null if not available)
 */
function getComponentBreakdown(region: any): {
  climateRisk: number | null;
  infrastructureGap: number | null;
  socioeconomicVuln: number | null;
  airQuality: number | null;
} {
  return {
    climateRisk: computeClimateRisk(region),
    infrastructureGap: computeInfrastructureGap(region),
    socioeconomicVuln: computeSocioeconomicVulnerability(region),
    airQuality: computeAirQualityScore(region),
  };
}
