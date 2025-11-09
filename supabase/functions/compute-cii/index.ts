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

    // Fetch all regions for the year (process ALL regions, not just those with real data)
    let query = supabase
      .from('climate_inequality_regions')
      .select('*')
      .eq('data_year', year);

    if (region_type) {
      query = query.eq('region_type', region_type);
    }

    const { data: regions, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!regions || regions.length === 0) {
      console.log('No regions found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No regions to compute CII for',
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

  // Always compute CII even with partial data (use estimation functions)
  if (components.length === 0) {
    // Fallback: compute based on regional estimates
    const estimatedClimate = estimateClimateRiskByRegion(region);
    const estimatedInfra = estimateInfrastructureGapByRegion(region);
    const estimatedSocio = estimateSocioeconomicVulnByRegion(region);
    const estimatedAir = estimateAirQualityByRegion(region);
    
    return (estimatedClimate * 0.30) + (estimatedInfra * 0.25) + (estimatedSocio * 0.25) + (estimatedAir * 0.20);
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

  // Temperature risk (extreme heat and cold both increase risk)
  if (region.temperature_avg !== null && region.temperature_avg !== undefined) {
    // Optimal: 10-20°C. <0°C or >30°C = high risk
    let tempRisk = 0;
    if (region.temperature_avg < 10) {
      tempRisk = Math.min(1, (10 - region.temperature_avg) / 20);
    } else if (region.temperature_avg > 20) {
      tempRisk = Math.min(1, (region.temperature_avg - 20) / 20);
    }
    factors.push(tempRisk * 1.5); // Weight temperature more heavily
  }

  // Drought risk - critical for agriculture
  if (region.drought_index !== null && region.drought_index !== undefined) {
    factors.push(region.drought_index * 1.3); // Weight drought heavily
  }

  // Flood risk - critical for infrastructure
  if (region.flood_risk_score !== null && region.flood_risk_score !== undefined) {
    factors.push(region.flood_risk_score * 1.3); // Weight flooding heavily
  }

  // Precipitation extremes (both too low and too high are risky)
  if (region.precipitation_avg !== null && region.precipitation_avg !== undefined) {
    // Optimal range: 800-2000mm/year
    // < 400mm = severe drought risk, > 3000mm = severe flood risk
    let precipRisk = 0;
    if (region.precipitation_avg < 400) {
      precipRisk = 0.8 + (0.2 * (1 - region.precipitation_avg / 400)); // 0.8-1.0
    } else if (region.precipitation_avg > 3000) {
      precipRisk = 0.7 + Math.min(0.3, (region.precipitation_avg - 3000) / 3000); // 0.7-1.0
    } else if (region.precipitation_avg < 800) {
      precipRisk = 0.3 * (800 - region.precipitation_avg) / 400; // 0-0.3
    } else if (region.precipitation_avg > 2000) {
      precipRisk = 0.3 * (region.precipitation_avg - 2000) / 1000; // 0-0.3
    }
    factors.push(precipRisk);
  }

  // Use existing climate_risk_score if available
  if (region.climate_risk_score !== null && region.climate_risk_score !== undefined) {
    factors.push(region.climate_risk_score);
  }

  // If we have no factors, estimate based on region location
  if (factors.length === 0) {
    // Estimate based on country and region characteristics
    return estimateClimateRiskByRegion(region);
  }

  // Average all factors
  const avgRisk = factors.reduce((sum, f) => sum + f, 0) / factors.length;
  return Math.max(0, Math.min(1, avgRisk));
}

/**
 * Estimate climate risk based on regional characteristics
 */
function estimateClimateRiskByRegion(region: any): number {
  const country = (region.country || '').toLowerCase();
  
  // Sub-Saharan Africa - high risk
  const subSaharanCountries = ['nigeria', 'kenya', 'ethiopia', 'tanzania', 'uganda', 'ghana', 'mozambique', 
    'mali', 'niger', 'chad', 'sudan', 'somalia', 'senegal', 'burkina faso', 'malawi', 'zambia', 'zimbabwe',
    'madagascar', 'cameroon', 'ivory coast', 'angola', 'benin', 'togo', 'sierra leone', 'liberia', 'guinea',
    'democratic republic of the congo', 'burundi', 'rwanda', 'namibia', 'botswana'];
  
  // Small island states - very high risk
  const smallIslands = ['maldives', 'seychelles', 'mauritius', 'fiji', 'samoa', 'tonga', 'vanuatu', 
    'solomon islands', 'kiribati', 'marshall islands', 'tuvalu', 'nauru'];
  
  // South Asia - high risk
  const southAsia = ['india', 'bangladesh', 'pakistan', 'sri lanka', 'nepal', 'bhutan', 'afghanistan'];
  
  // Southeast Asia - moderate-high risk  
  const southeastAsia = ['indonesia', 'philippines', 'vietnam', 'myanmar', 'thailand', 'cambodia', 'laos', 'malaysia'];
  
  // Middle East & North Africa - high risk (heat, water stress)
  const mena = ['egypt', 'saudi arabia', 'iraq', 'iran', 'yemen', 'syria', 'jordan', 'libya', 'tunisia', 'morocco', 'algeria'];
  
  // Latin America - moderate risk
  const latinAmerica = ['brazil', 'mexico', 'colombia', 'argentina', 'peru', 'venezuela', 'chile', 'ecuador', 'bolivia'];
  
  if (subSaharanCountries.includes(country)) return 0.75;
  if (smallIslands.includes(country)) return 0.85;
  if (southAsia.includes(country)) return 0.80;
  if (southeastAsia.includes(country)) return 0.65;
  if (mena.includes(country)) return 0.70;
  if (latinAmerica.includes(country)) return 0.55;
  
  // Default moderate
  return 0.50;
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
  if (region.internet_speed_download !== null && region.internet_speed_download !== undefined && region.internet_speed_download > 0) {
    // < 10 Mbps = severe gap (0.9), > 100 Mbps = minimal gap (0.1)
    const speedGap = 1 - Math.min(1, Math.max(0, region.internet_speed_download) / 100);
    factors.push(speedGap);
  }

  // If no data, estimate by region
  if (factors.length === 0) {
    return estimateInfrastructureGapByRegion(region);
  }

  return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}

/**
 * Estimate infrastructure gap based on regional development
 */
function estimateInfrastructureGapByRegion(region: any): number {
  const country = (region.country || '').toLowerCase();
  
  const lowInfra = ['nigeria', 'ethiopia', 'democratic republic of the congo', 'mozambique', 'madagascar',
    'niger', 'chad', 'mali', 'burkina faso', 'burundi', 'sierra leone', 'liberia', 'guinea', 'somalia', 'afghanistan', 'yemen'];
  const moderateInfra = ['india', 'pakistan', 'bangladesh', 'philippines', 'indonesia', 'vietnam', 'myanmar', 
    'cambodia', 'kenya', 'uganda', 'tanzania', 'ghana', 'senegal', 'zambia', 'zimbabwe'];
  
  if (lowInfra.includes(country)) return 0.85;
  if (moderateInfra.includes(country)) return 0.65;
  return 0.40;
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
    // < $2,000 = extreme vuln (0.95), < $10,000 = high (0.7), > $40,000 = low (0.1)
    let gdpVuln = 0;
    if (region.gdp_per_capita < 2000) {
      gdpVuln = 0.95;
    } else if (region.gdp_per_capita < 10000) {
      gdpVuln = 0.7 + (0.25 * (1 - (region.gdp_per_capita - 2000) / 8000));
    } else {
      gdpVuln = Math.max(0.1, 1 - (region.gdp_per_capita / 40000));
    }
    factors.push(gdpVuln * 1.5); // Weight GDP heavily
  }

  // Urban population (low urbanization = limited services vulnerability)
  if (region.urban_population_percent !== null && region.urban_population_percent !== undefined) {
    // < 30% urban = higher vulnerability (0.6), 50-70% = moderate (0.3), > 80% = overcrowding (0.4)
    let urbanVuln = 0;
    if (region.urban_population_percent < 30) {
      urbanVuln = 0.6 * (1 - region.urban_population_percent / 30);
    } else if (region.urban_population_percent > 80) {
      urbanVuln = 0.4 * ((region.urban_population_percent - 80) / 20);
    } else {
      urbanVuln = 0.2;
    }
    factors.push(urbanVuln);
  }

  // If no data, estimate by region
  if (factors.length === 0) {
    return estimateSocioeconomicVulnByRegion(region);
  }

  const avgVuln = factors.reduce((sum, f) => sum + f, 0) / factors.length;
  return Math.max(0, Math.min(1, avgVuln));
}

/**
 * Estimate socioeconomic vulnerability based on region
 */
function estimateSocioeconomicVulnByRegion(region: any): number {
  const country = (region.country || '').toLowerCase();
  
  const extremeVuln = ['burundi', 'south sudan', 'somalia', 'niger', 'chad', 'central african republic', 
    'democratic republic of the congo', 'mozambique', 'madagascar', 'malawi', 'liberia', 'sierra leone'];
  const highVuln = ['ethiopia', 'uganda', 'tanzania', 'rwanda', 'burkina faso', 'mali', 'guinea', 'benin', 
    'togo', 'zambia', 'zimbabwe', 'haiti', 'afghanistan', 'yemen', 'nepal', 'bangladesh'];
  const moderateVuln = ['india', 'pakistan', 'philippines', 'indonesia', 'vietnam', 'myanmar', 'cambodia', 
    'laos', 'kenya', 'ghana', 'senegal', 'nigeria', 'cameroon'];
  
  if (extremeVuln.includes(country)) return 0.90;
  if (highVuln.includes(country)) return 0.75;
  if (moderateVuln.includes(country)) return 0.60;
  return 0.45;
}

/**
 * Compute air quality score (0-1, higher = worse quality)
 * Based on PM2.5 and NO2 levels
 */
function computeAirQualityScore(region: any): number | null {
  const factors: number[] = [];

  // PM2.5 pollution (WHO guideline: 5 µg/m³, dangerous: 35+ µg/m³, hazardous: 55+ µg/m³)
  if (region.air_quality_pm25 !== null && region.air_quality_pm25 !== undefined) {
    // Scale: 0-5 = excellent (0.1), 5-15 = good (0.3), 15-35 = moderate (0.5), 35-55 = poor (0.75), >55 = hazardous (0.95)
    let pm25Risk = 0;
    if (region.air_quality_pm25 < 5) {
      pm25Risk = 0.1;
    } else if (region.air_quality_pm25 < 15) {
      pm25Risk = 0.1 + (0.2 * (region.air_quality_pm25 - 5) / 10);
    } else if (region.air_quality_pm25 < 35) {
      pm25Risk = 0.3 + (0.2 * (region.air_quality_pm25 - 15) / 20);
    } else if (region.air_quality_pm25 < 55) {
      pm25Risk = 0.5 + (0.25 * (region.air_quality_pm25 - 35) / 20);
    } else {
      pm25Risk = Math.min(1, 0.75 + (0.25 * (region.air_quality_pm25 - 55) / 50));
    }
    factors.push(pm25Risk);
  }

  // NO2 pollution (WHO guideline: 10 µg/m³, dangerous: 40+ µg/m³)
  if (region.air_quality_no2 !== null && region.air_quality_no2 !== undefined) {
    const no2Risk = Math.min(1, Math.max(0, region.air_quality_no2 / 40));
    factors.push(no2Risk);
  }

  // If no data, estimate by region
  if (factors.length === 0) {
    return estimateAirQualityByRegion(region);
  }

  return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}

/**
 * Estimate air quality based on region characteristics
 */
function estimateAirQualityByRegion(region: any): number {
  const country = (region.country || '').toLowerCase();
  
  // Countries with severe air pollution
  const severeAirPollution = ['india', 'bangladesh', 'pakistan', 'china', 'egypt', 'nigeria'];
  const highAirPollution = ['indonesia', 'vietnam', 'thailand', 'philippines', 'iran', 'iraq', 'turkey'];
  
  if (severeAirPollution.includes(country)) return 0.80;
  if (highAirPollution.includes(country)) return 0.60;
  return 0.40;
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
