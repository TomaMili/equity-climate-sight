import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive ISO3 -> ISO2 mapping for all countries
const ISO3_TO_ISO2: Record<string, string> = {
  // Europe
  DEU:'DE', FRA:'FR', GBR:'GB', ITA:'IT', ESP:'ES', POL:'PL', ROU:'RO', NLD:'NL', BEL:'BE', GRC:'GR',
  CZE:'CZ', PRT:'PT', SWE:'SE', HUN:'HU', AUT:'AT', BGR:'BG', DNK:'DK', FIN:'FI', SVK:'SK', NOR:'NO',
  IRL:'IE', HRV:'HR', BIH:'BA', SRB:'RS', CHE:'CH', LTU:'LT', SVN:'SI', LVA:'LV', EST:'EE', MKD:'MK',
  ALB:'AL', MDA:'MD', ISL:'IS', LUX:'LU', MNE:'ME', UKR:'UA', RUS:'RU', VAT:'VA', SMR:'SM', MCO:'MC',
  AND:'AD', LIE:'LI', MLT:'MT', CYP:'CY', BLR:'BY', XKX:'XK', GIB:'GI',
  // Americas
  USA:'US', CAN:'CA', MEX:'MX', BRA:'BR', ARG:'AR', COL:'CO', PER:'PE', VEN:'VE', CHL:'CL', ECU:'EC',
  GTM:'GT', CUB:'CU', HTI:'HT', BOL:'BO', DOM:'DO', HND:'HN', PRY:'PY', NIC:'NI', SLV:'SV', CRI:'CR',
  PAN:'PA', URY:'UY', JAM:'JM', TTO:'TT', GUY:'GY', SUR:'SR', BLZ:'BZ', BHS:'BS', BRB:'BB', GRD:'GD',
  VCT:'VC', LCA:'LC', DMA:'DM', ATG:'AG', KNA:'KN', ABW:'AW', CUW:'CW', PRI:'PR',
  // Asia
  CHN:'CN', IND:'IN', IDN:'ID', PAK:'PK', BGD:'BD', JPN:'JP', PHL:'PH', VNM:'VN', TUR:'TR', IRN:'IR',
  THA:'TH', MMR:'MM', KOR:'KR', IRQ:'IQ', AFG:'AF', SAU:'SA', UZB:'UZ', MYS:'MY', NPL:'NP', YEM:'YE',
  KHM:'KH', LKA:'LK', SYR:'SY', KAZ:'KZ', JOR:'JO', ARE:'AE', ISR:'IL', LAO:'LA', SGP:'SG', LBN:'LB',
  KWT:'KW', OMN:'OM', GEO:'GE', ARM:'AM', MNG:'MN', AZE:'AZ', TJK:'TJ', KGZ:'KG', TKM:'TM', BTN:'BT',
  MDV:'MV', PRK:'KP', TWN:'TW', PSE:'PS', HKG:'HK', MAC:'MO', BRN:'BN', TLS:'TL', QAT:'QA', BHR:'BH',
  // Africa
  NGA:'NG', ETH:'ET', EGY:'EG', COD:'CD', ZAF:'ZA', TZA:'TZ', KEN:'KE', UGA:'UG', DZA:'DZ', SDN:'SD',
  MAR:'MA', AGO:'AO', GHA:'GH', MOZ:'MZ', MDG:'MG', CMR:'CM', CIV:'CI', NER:'NE', BFA:'BF', MLI:'ML',
  MWI:'MW', ZMB:'ZM', SOM:'SO', SEN:'SN', TCD:'TD', ZWE:'ZW', GIN:'GN', RWA:'RW', BEN:'BJ', TUN:'TN',
  BDI:'BI', SSD:'SS', TGO:'TG', SLE:'SL', LBY:'LY', LBR:'LR', MRT:'MR', ERI:'ER', GMB:'GM', BWA:'BW',
  NAM:'NA', GAB:'GA', LSO:'LS', GNB:'GW', GNQ:'GQ', MUS:'MU', SWZ:'SZ', DJI:'DJ', COM:'KM', CPV:'CV',
  STP:'ST', SYC:'SC', REU:'RE', MYT:'YT', ESH:'EH',
  // Oceania
  AUS:'AU', PNG:'PG', NZL:'NZ', FJI:'FJ', SLB:'SB', VUT:'VU', NCL:'NC', PYF:'PF', WSM:'WS', GUM:'GU',
  KIR:'KI', FSM:'FM', TON:'TO', PLW:'PW', MHL:'MH', TUV:'TV', NRU:'NR', ASM:'AS', MNP:'MP', COK:'CK',
  NIU:'NU', TKL:'TK', WLF:'WF',
};

const REGIONS_PER_CALL = 50; // Process only 50 regions per function call to avoid timeout
const DB_BATCH_SIZE = 10; // Insert 10 records at a time to database

// Helper sluggify for region codes
function slug(str: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const years = [2020, 2021, 2022, 2023, 2024, 2025];

    // Get progress tracking
    const { data: progressData } = await supabase
      .from('initialization_progress')
      .select()
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    const progressId = progressData?.id;

    if (progressId) {
      await supabase
        .from('initialization_progress')
        .update({ 
          status: 'regions',
          current_step: 'Fetching regional boundaries...'
        })
        .eq('id', progressId);
    }

    // Fetch Natural Earth admin-1 (states/provinces)
    console.log('📥 Fetching Natural Earth admin-1 (states/provinces) ...');
    const admin1Resp = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson');
    if (!admin1Resp.ok) throw new Error('Failed to fetch admin-1 dataset');
    const admin1 = await admin1Resp.json();
    
    const totalRegions = admin1.features.length;
    console.log(`Total regions available: ${totalRegions}`);
    
    // Check which regions already exist in database (for any year)
    const { data: existingRegions } = await supabase
      .from('climate_inequality_regions')
      .select('region_code')
      .eq('region_type', 'region')
      .eq('data_year', 2024);
    
    const existingCodes = new Set(existingRegions?.map(r => r.region_code) || []);
    const processedCount = existingCodes.size;
    
    console.log(`Already processed: ${processedCount}/${totalRegions} regions`);
    
    // Update progress
    if (progressId) {
      await supabase
        .from('initialization_progress')
        .update({ 
          total_regions: totalRegions,
          processed_regions: processedCount,
          current_step: `Resuming from ${processedCount}/${totalRegions} regions...`
        })
        .eq('id', progressId);
    }

    // Filter to only unprocessed regions
    const unprocessedFeatures = admin1.features.filter((f: any) => {
      const iso2 = f.properties.iso_a2 || ISO3_TO_ISO2[f.properties.iso_a3];
      const regionName = f.properties.name || f.properties.name_en || f.properties.name_local;
      if (!iso2 || !regionName) return false;
      
      let codePart = f.properties.postal || f.properties.abbrev || slug(regionName).slice(0, 8);
      codePart = (codePart || slug(regionName)).toUpperCase();
      const regionCode = `${iso2}-${codePart}`;
      
      return !existingCodes.has(regionCode);
    });

    const remainingCount = unprocessedFeatures.length;
    console.log(`Remaining to process: ${remainingCount} regions`);

    if (remainingCount === 0) {
      // All done!
      if (progressId) {
        await supabase
          .from('initialization_progress')
          .update({ 
            status: 'completed',
            current_step: 'All regions processed',
            processed_regions: totalRegions
          })
          .eq('id', progressId);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          complete: true,
          message: 'All regions already processed',
          processed: processedCount,
          total: totalRegions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process only REGIONS_PER_CALL regions this invocation
    const toProcess = unprocessedFeatures.slice(0, REGIONS_PER_CALL);
    console.log(`Processing ${toProcess.length} regions this call...`);
    
    let newlyProcessed = 0;
    const recordsToInsert: any[] = [];

    for (const f of toProcess) {
      const iso2 = f.properties.iso_a2 || ISO3_TO_ISO2[f.properties.iso_a3];
      const regionName = f.properties.name || f.properties.name_en || f.properties.name_local;
      const countryName = f.properties.adm0_name || f.properties.sovereignt || f.properties.admin;
      if (!iso2 || !regionName || !countryName) continue;

      let codePart = f.properties.postal || f.properties.abbrev || slug(regionName).slice(0, 8);
      codePart = (codePart || slug(regionName)).toUpperCase();
      const regionCode = `${iso2}-${codePart}`;

      let geometry = f.geometry;
      if (geometry?.type === 'Polygon') {
        geometry = { type: 'MultiPolygon', coordinates: [geometry.coordinates] };
      }
      const centroid = calculateCentroid(geometry);

      // Create records for all years
      for (const y of years) {
        recordsToInsert.push({
          region_code: regionCode,
          region_name: regionName,
          region_type: 'region',
          country: countryName,
          data_year: y,
          geometry,
          centroid: { type: 'Point', coordinates: centroid },
          ...generateSyntheticData(regionName, y, 'region')
        });
      }
      
      newlyProcessed++;
    }

    // Insert in smaller batches to avoid timeouts
    console.log(`Inserting ${recordsToInsert.length} records in batches of ${DB_BATCH_SIZE}...`);
    for (let i = 0; i < recordsToInsert.length; i += DB_BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + DB_BATCH_SIZE);
      const { error } = await supabase
        .from('climate_inequality_regions')
        .upsert(batch, { onConflict: 'region_code,data_year', ignoreDuplicates: false });
      
      if (error) {
        console.error(`Error inserting batch at index ${i}:`, error);
      }
    }

    const newProcessedTotal = processedCount + newlyProcessed;
    const stillRemaining = totalRegions - newProcessedTotal;
    
    console.log(`✅ Processed ${newlyProcessed} regions. Total: ${newProcessedTotal}/${totalRegions}. Remaining: ${stillRemaining}`);

    // Update progress
    if (progressId) {
      const isComplete = stillRemaining === 0;
      await supabase
        .from('initialization_progress')
        .update({ 
          status: isComplete ? 'completed' : 'regions',
          current_step: isComplete 
            ? 'All regions processed!' 
            : `Processed ${newProcessedTotal}/${totalRegions} regions. ${stillRemaining} remaining...`,
          processed_regions: newProcessedTotal
        })
        .eq('id', progressId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        complete: stillRemaining === 0,
        message: stillRemaining === 0 
          ? 'Region initialization complete' 
          : `Processed ${newlyProcessed} regions. ${stillRemaining} remaining.`,
        processed: newProcessedTotal,
        total: totalRegions,
        remaining: stillRemaining,
        shouldContinue: stillRemaining > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('initialize-regions error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateSyntheticData(regionName: string, year: number, type: 'country' | 'region') {
  const isHighIncome = /United States|Germany|Japan|United Kingdom|France|Canada|Australia|Netherlands|Sweden|Denmark|Norway/.test(regionName);
  const isHotClimate = /India|Saudi Arabia|Nigeria|Egypt|Brazil|Mexico|Pakistan|Bangladesh|Indonesia/.test(regionName);
  const isHighPollution = /China|India|Bangladesh|Pakistan|Indonesia|Egypt/.test(regionName);

  const yearFactor = 1 + (year - 2020) * 0.02;

  const baseTemp = isHotClimate ? 28 : 12;
  const basePollution = isHighPollution ? 45 : 15;
  const baseGDP = isHighIncome ? 45000 : 8000;
  const baseInfra = isHighIncome ? 0.85 : 0.45;

  const rand = (base: number, variance: number) => base + (Math.random() - 0.5) * variance * 2;

  const temperature = rand(baseTemp * yearFactor, 2);
  const pm25 = rand(basePollution * yearFactor, 10);
  const no2 = rand(basePollution * 0.6 * yearFactor, 5);
  const gdp = rand(baseGDP, baseGDP * 0.2);
  const infraScore = Math.min(0.98, Math.max(0.05, rand(baseInfra, 0.1)));

  const climateRisk = Math.min(1, Math.max(0, (temperature - 10) / 25 + Math.random() * 0.2));
  const socioeconomicScore = Math.min(1, Math.max(0, (50000 - gdp) / 50000));
  const ciiScore = Math.min(1, Math.max(0, climateRisk * 0.4 + socioeconomicScore * 0.3 + (1 - infraScore) * 0.3));

  return {
    cii_score: Number(ciiScore.toFixed(3)),
    climate_risk_score: Number(climateRisk.toFixed(3)),
    infrastructure_score: Number(infraScore.toFixed(3)),
    socioeconomic_score: Number(socioeconomicScore.toFixed(3)),
    population: Math.floor(rand(type === 'country' ? 50000000 : 5000000, 10000000)),
    air_quality_pm25: Number(pm25.toFixed(2)),
    air_quality_no2: Number(no2.toFixed(2)),
    internet_speed_download: Number(rand(isHighIncome ? 100 : 20, 30).toFixed(2)),
    internet_speed_upload: Number(rand(isHighIncome ? 50 : 10, 15).toFixed(2)),
    temperature_avg: Number(temperature.toFixed(2)),
    precipitation_avg: Number(rand(isHotClimate ? 800 : 1200, 300).toFixed(2)),
    drought_index: Number(rand(isHotClimate ? 0.6 : 0.3, 0.2).toFixed(3)),
    flood_risk_score: Number(rand(0.4, 0.2).toFixed(3)),
    gdp_per_capita: Number(gdp.toFixed(2)),
    urban_population_percent: Number(rand(isHighIncome ? 80 : 50, 15).toFixed(2)),
    data_sources: ['Natural Earth', 'Synthetic'],
    last_updated: new Date().toISOString(),
  };
}

function calculateCentroid(geometry: any): [number, number] {
  const coords: [number, number][] = [];
  if (!geometry) return [0, 0];
  if (geometry.type === 'Polygon') {
    coords.push(...geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) coords.push(...polygon[0]);
  }
  if (coords.length === 0) return [0, 0];
  const sumLon = coords.reduce((s, c) => s + c[0], 0);
  const sumLat = coords.reduce((s, c) => s + c[1], 0);
  return [sumLon / coords.length, sumLat / coords.length];
}
