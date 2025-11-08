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

    console.log('📥 Fetching Natural Earth GeoJSON data...');
    
    // Fetch Natural Earth data
    const response = await fetch(
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Natural Earth data: ${response.statusText}`);
    }

    const geojsonData = await response.json();
    console.log(`✅ Loaded ${geojsonData.features.length} country features`);

    const results: Record<string, any> = {};
    let updated = 0;
    let skipped = 0;

    for (const feature of geojsonData.features) {
      const iso3 = feature.properties.ADM0_A3 || feature.properties.ISO_A3;
      const countryName = feature.properties.ADMIN || feature.properties.NAME;
      
      // Map ISO3 to our 2-letter code
      const regionCode = isoMapping[iso3];
      
      if (!regionCode) {
        console.log(`⏭️  Skipping ${countryName} (${iso3}) - not in our database`);
        skipped++;
        continue;
      }

      // Convert geometry to MultiPolygon if it's a Polygon
      let geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        geometry = {
          type: 'MultiPolygon',
          coordinates: [geometry.coordinates]
        };
      }

      // Calculate centroid from geometry
      const centroid = calculateCentroid(geometry);

      try {
        console.log(`📍 Updating ${countryName} (${regionCode})...`);
        
        // Update the geometry in the database
        const { error } = await supabase
          .from('climate_inequality_regions')
          .update({
            geometry: geometry,
            centroid: {
              type: 'Point',
              coordinates: centroid
            }
          })
          .eq('region_code', regionCode)
          .eq('region_type', 'country');

        if (error) {
          console.error(`❌ Error updating ${regionCode}:`, error.message);
          results[regionCode] = {
            success: false,
            error: error.message,
            country: countryName
          };
        } else {
          console.log(`✅ Updated ${countryName} (${regionCode})`);
          results[regionCode] = {
            success: true,
            country: countryName
          };
          updated++;
        }
      } catch (err) {
        console.error(`❌ Exception updating ${regionCode}:`, err);
        results[regionCode] = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          country: countryName
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
