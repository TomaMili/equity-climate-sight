import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 5; // Process 5 countries at a time

// Validation schema for climate inequality records
const climateRecordSchema = z.object({
  region_code: z.string().min(1).max(50),
  region_name: z.string().min(1).max(200),
  region_type: z.enum(['country', 'region']),
  country: z.string().min(1).max(200),
  data_year: z.number().int().min(2000).max(2100),
  cii_score: z.number().min(0).max(1),
  climate_risk_score: z.number().min(0).max(1),
  infrastructure_score: z.number().min(0).max(1),
  socioeconomic_score: z.number().min(0).max(1),
  population: z.number().int().min(1),
  air_quality_pm25: z.number().min(0).max(1000),
  air_quality_no2: z.number().min(0).max(500),
  internet_speed_download: z.number().min(0).max(10000),
  internet_speed_upload: z.number().min(0).max(10000),
  temperature_avg: z.number().min(-50).max(60),
  precipitation_avg: z.number().min(0).max(15000),
  drought_index: z.number().min(0).max(1),
  flood_risk_score: z.number().min(0).max(1),
  gdp_per_capita: z.number().min(0),
  urban_population_percent: z.number().min(0).max(100),
  data_sources: z.array(z.string()),
  last_updated: z.string().datetime(),
  geometry: z.any(), // Complex PostGIS type
  centroid: z.any(), // Complex PostGIS type
});

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    let countryCount = 0;

    // Initialize progress tracking
    const { data: progressData } = await supabase
      .from('initialization_progress')
      .insert({ 
        status: 'countries', 
        current_step: 'Fetching country boundaries...' 
      })
      .select()
      .single();
    
    const progressId = progressData?.id;

    // Fetch Natural Earth admin-0 (countries) - using 50m for better coverage
    console.log('📥 Fetching Natural Earth admin-0 (countries) ...');
    const admin0Resp = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson');
    if (!admin0Resp.ok) throw new Error('Failed to fetch admin-0 dataset');
    const admin0 = await admin0Resp.json();

    console.log(`Processing ${admin0.features.length} countries in batches of ${BATCH_SIZE}...`);
    
    if (progressId) {
      await supabase
        .from('initialization_progress')
        .update({ 
          total_countries: admin0.features.length,
          current_step: 'Processing countries in batches...'
        })
        .eq('id', progressId);
    }

    // Process countries in batches
    for (let i = 0; i < admin0.features.length; i += BATCH_SIZE) {
      const batch = admin0.features.slice(i, i + BATCH_SIZE);
      
      for (const f of batch) {
        const iso3 = f.properties.ADM0_A3 || f.properties.ISO_A3;
        const iso2 = ISO3_TO_ISO2[iso3];
        const countryName = f.properties.ADMIN || f.properties.NAME;
        
        if (!iso2) {
          console.warn(`⚠️ No ISO2 mapping for ${iso3} (${countryName})`);
          continue;
        }
        if (!countryName) continue;

        let geometry = f.geometry;
        if (geometry?.type === 'Polygon') {
          geometry = { type: 'MultiPolygon', coordinates: [geometry.coordinates] };
        }
        const centroid = calculateCentroid(geometry);

        for (const y of years) {
          const rec = {
            region_code: iso2,
            region_name: countryName,
            region_type: 'country',
            country: countryName,
            data_year: y,
            geometry,
            centroid: { type: 'Point', coordinates: centroid },
            ...generateSyntheticData(countryName, y, 'country')
          };
          
          // Validate record before insertion
          try {
            climateRecordSchema.parse(rec);
            const { error } = await supabase
              .from('climate_inequality_regions')
              .upsert(rec, { onConflict: 'region_code,data_year', ignoreDuplicates: false });
            
            if (error) {
              console.error(`Error upserting ${iso2} (${y}):`, error.message);
            } else if (y === 2024) {
              countryCount++;
            }
          } catch (err) {
            if (err instanceof z.ZodError) {
              console.error(`Validation failed for ${iso2} (${y}):`, 
                err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
            }
          }
        }
      }
      
      // Update progress after each batch
      if (progressId) {
        await supabase
          .from('initialization_progress')
          .update({ 
            processed_countries: Math.min(i + BATCH_SIZE, admin0.features.length),
            current_step: `Processed ${Math.min(i + BATCH_SIZE, admin0.features.length)}/${admin0.features.length} countries...`
          })
          .eq('id', progressId);
      }
      
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Processed ${Math.min(i + BATCH_SIZE, admin0.features.length)}/${admin0.features.length} countries`);
    }

    // Mark countries as complete
    if (progressId) {
      await supabase
        .from('initialization_progress')
        .update({ 
          status: 'countries_complete',
          current_step: 'Countries loaded. Starting regions...',
          processed_countries: countryCount
        })
        .eq('id', progressId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Country initialization complete',
        summary: { countryCount2024: countryCount }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('initialize-countries error:', error);
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
    population: Math.max(1, Math.floor(rand(type === 'country' ? 50000000 : 5000000, 10000000))),
    air_quality_pm25: Math.max(0, Number(pm25.toFixed(2))),
    air_quality_no2: Math.max(0, Number(no2.toFixed(2))),
    internet_speed_download: Math.max(0, Number(rand(isHighIncome ? 100 : 20, 30).toFixed(2))),
    internet_speed_upload: Math.max(0, Number(rand(isHighIncome ? 50 : 10, 15).toFixed(2))),
    temperature_avg: Number(temperature.toFixed(2)),
    precipitation_avg: Math.max(0, Number(rand(isHotClimate ? 800 : 1200, 300).toFixed(2))),
    drought_index: Math.max(0, Number(rand(isHotClimate ? 0.6 : 0.3, 0.2).toFixed(3))),
    flood_risk_score: Math.max(0, Number(rand(0.4, 0.2).toFixed(3))),
    gdp_per_capita: Math.max(0, Number(gdp.toFixed(2))),
    urban_population_percent: Math.max(0, Math.min(100, Number(rand(isHighIncome ? 80 : 50, 15).toFixed(2)))),
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
