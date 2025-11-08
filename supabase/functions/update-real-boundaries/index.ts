import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping of ISO3 codes to our 2-letter codes
const isoMapping: Record<string, string> = {
  'DEU': 'DE',
  'POL': 'PL',
  'FRA': 'FR',
  'ESP': 'ES',
  'ITA': 'IT',
  'GRC': 'GR',
  'ROU': 'RO',
  'BGR': 'BG',
  'GBR': 'GB',
  'NLD': 'NL',
  'SWE': 'SE',
  'PRT': 'PT',
  'USA': 'US',
  'CAN': 'CA',
  'IND': 'IN',
  'CHN': 'CN',
  'BRA': 'BR',
  'MEX': 'MX',
  'AUS': 'AU',
  'JPN': 'JP',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all regions from database first
    const { data: dbRegions, error: fetchError } = await supabase
      .from('climate_inequality_regions')
      .select('region_code, region_type, region_name, country');

    if (fetchError) {
      throw new Error(`Failed to fetch regions: ${fetchError.message}`);
    }

    console.log('📥 Fetching Natural Earth country data...');
    const countryResponse = await fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    );
    if (!countryResponse.ok) {
      throw new Error(`Failed to fetch country data: ${countryResponse.statusText}`);
    }
    const countryData = await countryResponse.json();
    console.log(`✅ Loaded ${countryData.features.length} countries`);

    console.log('📥 Fetching Natural Earth admin-1 (states/provinces) data...');
    const admin1Response = await fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'
    );
    if (!admin1Response.ok) {
      throw new Error(`Failed to fetch admin-1 data: ${admin1Response.statusText}`);
    }
    const admin1Data = await admin1Response.json();
    console.log(`✅ Loaded ${admin1Data.features.length} regions`);

    const results: Record<string, any> = {};
    let updated = 0;
    let skipped = 0;

    // Process countries
    for (const feature of countryData.features) {
      const iso3 = feature.properties.ADM0_A3 || feature.properties.ISO_A3;
      const countryName = feature.properties.ADMIN || feature.properties.NAME;
      const regionCode = isoMapping[iso3];
      
      if (!regionCode) {
        skipped++;
        continue;
      }

      let geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        geometry = { type: 'MultiPolygon', coordinates: [geometry.coordinates] };
      }
      const centroid = calculateCentroid(geometry);

      try {
        console.log(`📍 Updating country ${countryName} (${regionCode})...`);
        const { error } = await supabase
          .from('climate_inequality_regions')
          .update({
            geometry: geometry,
            centroid: { type: 'Point', coordinates: centroid }
          })
          .eq('region_code', regionCode)
          .eq('region_type', 'country');

        if (error) {
          results[regionCode] = { success: false, error: error.message, name: countryName };
        } else {
          results[regionCode] = { success: true, name: countryName, type: 'country' };
          updated++;
        }
      } catch (err) {
        results[regionCode] = { 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown', 
          name: countryName 
        };
      }
    }

    // Process admin-1 regions (states/provinces)
    for (const feature of admin1Data.features) {
      const iso2 = feature.properties.iso_a2;
      const regionName = feature.properties.name;
      const postal = feature.properties.postal;
      
      if (!iso2) continue;

      // Find matching region in database
      const dbRegion = dbRegions?.find(r => 
        r.region_type !== 'country' && 
        r.country === getCountryNameFromISO(iso2) &&
        (r.region_code === postal || 
         r.region_name.toLowerCase().replace(/\s+/g, '') === regionName.toLowerCase().replace(/\s+/g, '') ||
         regionName.toLowerCase().includes(r.region_name.toLowerCase()))
      );
      
      if (!dbRegion) continue;

      let geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        geometry = { type: 'MultiPolygon', coordinates: [geometry.coordinates] };
      }
      const centroid = calculateCentroid(geometry);

      try {
        console.log(`📍 Updating region ${dbRegion.region_name} (${dbRegion.region_code})...`);
        const { error } = await supabase
          .from('climate_inequality_regions')
          .update({
            geometry: geometry,
            centroid: { type: 'Point', coordinates: centroid }
          })
          .eq('region_code', dbRegion.region_code)
          .eq('region_type', dbRegion.region_type);

        if (error) {
          results[dbRegion.region_code] = { success: false, error: error.message, name: regionName };
        } else {
          results[dbRegion.region_code] = { success: true, name: regionName, type: 'region' };
          updated++;
        }
      } catch (err) {
        results[dbRegion.region_code] = { 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown',
          name: regionName 
        };
      }
    }

    const summary = {
      total: Object.keys(results).length,
      updated: updated,
      skipped: skipped,
      timestamp: new Date().toISOString()
    };

    console.log('\n📊 Summary:');
    console.log(`✅ Updated: ${updated} countries`);
    console.log(`⏭️  Skipped: ${skipped} countries`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        message: '🎉 Real country boundaries updated successfully!'
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
 * Get country name from ISO 2-letter code
 */
function getCountryNameFromISO(iso: string): string {
  const countryNames: Record<string, string> = {
    'DE': 'Germany', 'PL': 'Poland', 'FR': 'France', 'ES': 'Spain',
    'IT': 'Italy', 'GR': 'Greece', 'RO': 'Romania', 'BG': 'Bulgaria',
    'GB': 'United Kingdom', 'NL': 'Netherlands', 'SE': 'Sweden',
    'PT': 'Portugal', 'US': 'United States', 'CA': 'Canada',
    'IN': 'India', 'CN': 'China', 'BR': 'Brazil', 'MX': 'Mexico',
    'AU': 'Australia', 'JP': 'Japan'
  };
  return countryNames[iso] || iso;
}

/**
 * Calculate approximate centroid from geometry
 */
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
