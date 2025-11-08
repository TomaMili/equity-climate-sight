import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive country mapping - 100+ countries worldwide
const COUNTRIES: Record<string, string> = {
  // Europe
  'DEU': 'Germany', 'FRA': 'France', 'GBR': 'United Kingdom', 'ITA': 'Italy', 'ESP': 'Spain',
  'POL': 'Poland', 'ROU': 'Romania', 'NLD': 'Netherlands', 'BEL': 'Belgium', 'GRC': 'Greece',
  'CZE': 'Czech Republic', 'PRT': 'Portugal', 'SWE': 'Sweden', 'HUN': 'Hungary', 'AUT': 'Austria',
  'BGR': 'Bulgaria', 'DNK': 'Denmark', 'FIN': 'Finland', 'SVK': 'Slovakia', 'NOR': 'Norway',
  'IRL': 'Ireland', 'HRV': 'Croatia', 'BIH': 'Bosnia and Herzegovina', 'SRB': 'Serbia', 'CHE': 'Switzerland',
  'LTU': 'Lithuania', 'SVN': 'Slovenia', 'LVA': 'Latvia', 'EST': 'Estonia', 'MKD': 'North Macedonia',
  'ALB': 'Albania', 'MDA': 'Moldova', 'ISL': 'Iceland', 'LUX': 'Luxembourg', 'MNE': 'Montenegro',
  
  // Americas
  'USA': 'United States', 'CAN': 'Canada', 'MEX': 'Mexico', 'BRA': 'Brazil', 'ARG': 'Argentina',
  'COL': 'Colombia', 'PER': 'Peru', 'VEN': 'Venezuela', 'CHL': 'Chile', 'ECU': 'Ecuador',
  'GTM': 'Guatemala', 'CUB': 'Cuba', 'HTI': 'Haiti', 'BOL': 'Bolivia', 'DOM': 'Dominican Republic',
  'HND': 'Honduras', 'PRY': 'Paraguay', 'NIC': 'Nicaragua', 'SLV': 'El Salvador', 'CRI': 'Costa Rica',
  'PAN': 'Panama', 'URY': 'Uruguay', 'JAM': 'Jamaica', 'TTO': 'Trinidad and Tobago',
  
  // Asia
  'CHN': 'China', 'IND': 'India', 'IDN': 'Indonesia', 'PAK': 'Pakistan', 'BGD': 'Bangladesh',
  'JPN': 'Japan', 'PHL': 'Philippines', 'VNM': 'Vietnam', 'TUR': 'Turkey', 'IRN': 'Iran',
  'THA': 'Thailand', 'MMR': 'Myanmar', 'KOR': 'South Korea', 'IRQ': 'Iraq', 'AFG': 'Afghanistan',
  'SAU': 'Saudi Arabia', 'UZB': 'Uzbekistan', 'MYS': 'Malaysia', 'NPL': 'Nepal', 'YEM': 'Yemen',
  'KHM': 'Cambodia', 'LKA': 'Sri Lanka', 'SYR': 'Syria', 'KAZ': 'Kazakhstan', 'JOR': 'Jordan',
  'ARE': 'United Arab Emirates', 'ISR': 'Israel', 'LAO': 'Laos', 'SGP': 'Singapore', 'LBN': 'Lebanon',
  'KWT': 'Kuwait', 'OMN': 'Oman', 'GEO': 'Georgia', 'ARM': 'Armenia', 'MNG': 'Mongolia',
  
  // Africa
  'NGA': 'Nigeria', 'ETH': 'Ethiopia', 'EGY': 'Egypt', 'COD': 'Democratic Republic of Congo', 'ZAF': 'South Africa',
  'TZA': 'Tanzania', 'KEN': 'Kenya', 'UGA': 'Uganda', 'DZA': 'Algeria', 'SDN': 'Sudan',
  'MAR': 'Morocco', 'AGO': 'Angola', 'GHA': 'Ghana', 'MOZ': 'Mozambique', 'MDG': 'Madagascar',
  'CMR': 'Cameroon', 'CIV': "Côte d'Ivoire", 'NER': 'Niger', 'BFA': 'Burkina Faso', 'MLI': 'Mali',
  'MWI': 'Malawi', 'ZMB': 'Zambia', 'SOM': 'Somalia', 'SEN': 'Senegal', 'TCD': 'Chad',
  'ZWE': 'Zimbabwe', 'GIN': 'Guinea', 'RWA': 'Rwanda', 'BEN': 'Benin', 'TUN': 'Tunisia',
  'BDI': 'Burundi', 'SSD': 'South Sudan', 'TGO': 'Togo', 'SLE': 'Sierra Leone', 'LBY': 'Libya',
  
  // Oceania
  'AUS': 'Australia', 'PNG': 'Papua New Guinea', 'NZL': 'New Zealand', 'FJI': 'Fiji',
  
  // Russia & Central Asia
  'RUS': 'Russia', 'TJK': 'Tajikistan', 'KGZ': 'Kyrgyzstan', 'TKM': 'Turkmenistan',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🌍 Starting comprehensive data initialization...');
    
    // Fetch Natural Earth country boundaries
    console.log('📥 Fetching Natural Earth country data...');
    const countryResponse = await fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    );
    const countryData = await countryResponse.json();
    console.log(`✅ Loaded ${countryData.features.length} countries from Natural Earth`);

    const years = [2020, 2021, 2022, 2023, 2024, 2025];
    const insertedRegions = [];
    let totalInserted = 0;

    // Process each country
    for (const feature of countryData.features) {
      const iso3 = feature.properties.ADM0_A3 || feature.properties.ISO_A3;
      const countryName = COUNTRIES[iso3];
      
      if (!countryName) continue;

      // Get 2-letter code from ISO3
      const iso2 = getISO2FromISO3(iso3);
      
      let geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        geometry = { type: 'MultiPolygon', coordinates: [geometry.coordinates] };
      }
      const centroid = calculateCentroid(geometry);

      // Create entries for each year
      for (const year of years) {
        const regionData = {
          region_code: iso2,
          region_name: countryName,
          region_type: 'country',
          country: countryName,
          data_year: year,
          geometry: geometry,
          centroid: { type: 'Point', coordinates: centroid },
          ...generateSyntheticData(countryName, year, 'country')
        };

        const { error } = await supabase
          .from('climate_inequality_regions')
          .upsert(regionData, {
            onConflict: 'region_code,data_year',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`Error inserting ${countryName} (${year}):`, error);
        } else {
          totalInserted++;
          if (year === 2024) {
            insertedRegions.push(countryName);
          }
        }
      }
    }

    console.log(`\n✅ Initialization complete!`);
    console.log(`📊 Total records inserted: ${totalInserted}`);
    console.log(`🌍 Countries: ${insertedRegions.length}`);
    console.log(`📅 Years: 2020-2025`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalRecords: totalInserted,
          countries: insertedRegions.length,
          years: years.length,
          countriesList: insertedRegions.slice(0, 20)
        },
        message: '🎉 Database initialized with comprehensive global data!'
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

function getISO2FromISO3(iso3: string): string {
  const mapping: Record<string, string> = {
    'DEU': 'DE', 'FRA': 'FR', 'GBR': 'GB', 'ITA': 'IT', 'ESP': 'ES',
    'POL': 'PL', 'ROU': 'RO', 'NLD': 'NL', 'BEL': 'BE', 'GRC': 'GR',
    'CZE': 'CZ', 'PRT': 'PT', 'SWE': 'SE', 'HUN': 'HU', 'AUT': 'AT',
    'BGR': 'BG', 'DNK': 'DK', 'FIN': 'FI', 'SVK': 'SK', 'NOR': 'NO',
    'IRL': 'IE', 'HRV': 'HR', 'BIH': 'BA', 'SRB': 'RS', 'CHE': 'CH',
    'LTU': 'LT', 'SVN': 'SI', 'LVA': 'LV', 'EST': 'EE', 'MKD': 'MK',
    'ALB': 'AL', 'MDA': 'MD', 'ISL': 'IS', 'LUX': 'LU', 'MNE': 'ME',
    'USA': 'US', 'CAN': 'CA', 'MEX': 'MX', 'BRA': 'BR', 'ARG': 'AR',
    'COL': 'CO', 'PER': 'PE', 'VEN': 'VE', 'CHL': 'CL', 'ECU': 'EC',
    'GTM': 'GT', 'CUB': 'CU', 'HTI': 'HT', 'BOL': 'BO', 'DOM': 'DO',
    'HND': 'HN', 'PRY': 'PY', 'NIC': 'NI', 'SLV': 'SV', 'CRI': 'CR',
    'PAN': 'PA', 'URY': 'UY', 'JAM': 'JM', 'TTO': 'TT',
    'CHN': 'CN', 'IND': 'IN', 'IDN': 'ID', 'PAK': 'PK', 'BGD': 'BD',
    'JPN': 'JP', 'PHL': 'PH', 'VNM': 'VN', 'TUR': 'TR', 'IRN': 'IR',
    'THA': 'TH', 'MMR': 'MM', 'KOR': 'KR', 'IRQ': 'IQ', 'AFG': 'AF',
    'SAU': 'SA', 'UZB': 'UZ', 'MYS': 'MY', 'NPL': 'NP', 'YEM': 'YE',
    'KHM': 'KH', 'LKA': 'LK', 'SYR': 'SY', 'KAZ': 'KZ', 'JOR': 'JO',
    'ARE': 'AE', 'ISR': 'IL', 'LAO': 'LA', 'SGP': 'SG', 'LBN': 'LB',
    'KWT': 'KW', 'OMN': 'OM', 'GEO': 'GE', 'ARM': 'AM', 'MNG': 'MN',
    'NGA': 'NG', 'ETH': 'ET', 'EGY': 'EG', 'COD': 'CD', 'ZAF': 'ZA',
    'TZA': 'TZ', 'KEN': 'KE', 'UGA': 'UG', 'DZA': 'DZ', 'SDN': 'SD',
    'MAR': 'MA', 'AGO': 'AO', 'GHA': 'GH', 'MOZ': 'MZ', 'MDG': 'MG',
    'CMR': 'CM', 'CIV': 'CI', 'NER': 'NE', 'BFA': 'BF', 'MLI': 'ML',
    'MWI': 'MW', 'ZMB': 'ZM', 'SOM': 'SO', 'SEN': 'SN', 'TCD': 'TD',
    'ZWE': 'ZW', 'GIN': 'GN', 'RWA': 'RW', 'BEN': 'BJ', 'TUN': 'TN',
    'BDI': 'BI', 'SSD': 'SS', 'TGO': 'TG', 'SLE': 'SL', 'LBY': 'LY',
    'AUS': 'AU', 'PNG': 'PG', 'NZL': 'NZ', 'FJI': 'FJ',
    'RUS': 'RU', 'TJK': 'TJ', 'KGZ': 'KG', 'TKM': 'TM',
  };
  return mapping[iso3] || iso3.substring(0, 2);
}

function generateSyntheticData(regionName: string, year: number, type: string) {
  // Base values vary by region characteristics
  const isHighIncome = ['United States', 'Germany', 'Japan', 'United Kingdom', 'France', 'Canada', 'Australia'].includes(regionName);
  const isHotClimate = ['India', 'Saudi Arabia', 'Nigeria', 'Egypt', 'Brazil', 'Mexico'].includes(regionName);
  const isHighPollution = ['China', 'India', 'Bangladesh', 'Pakistan', 'Indonesia'].includes(regionName);
  
  // Year-based trend (worsening climate over time)
  const yearFactor = 1 + (year - 2020) * 0.02; // 2% worse per year
  
  // Generate realistic values
  const baseTemp = isHotClimate ? 28 : 12;
  const basePollution = isHighPollution ? 45 : 15;
  const baseGDP = isHighIncome ? 45000 : 8000;
  const baseInfra = isHighIncome ? 0.85 : 0.45;
  
  // Add some randomness
  const rand = (base: number, variance: number) => 
    base + (Math.random() - 0.5) * variance * 2;

  const temperature = rand(baseTemp * yearFactor, 2);
  const pm25 = rand(basePollution * yearFactor, 10);
  const no2 = rand(basePollution * 0.6 * yearFactor, 5);
  const gdp = rand(baseGDP, baseGDP * 0.2);
  const infraScore = Math.min(0.95, rand(baseInfra, 0.1));
  
  // Calculate composite CII score (0-1 scale, higher = worse inequality)
  const climateRisk = Math.min(1, (temperature - 10) / 25 + Math.random() * 0.2);
  const socioeconomicScore = Math.min(1, (50000 - gdp) / 50000);
  const ciiScore = (climateRisk * 0.4 + socioeconomicScore * 0.3 + (1 - infraScore) * 0.3);
  
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
    last_updated: new Date().toISOString()
  };
}

function calculateCentroid(geometry: any): [number, number] {
  const coords: [number, number][] = [];
  
  if (geometry.type === 'Polygon') {
    coords.push(...geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      coords.push(...polygon[0]);
    }
  }

  if (coords.length === 0) return [0, 0];

  const sumLon = coords.reduce((sum, coord) => sum + coord[0], 0);
  const sumLat = coords.reduce((sum, coord) => sum + coord[1], 0);

  return [sumLon / coords.length, sumLat / coords.length];
}
