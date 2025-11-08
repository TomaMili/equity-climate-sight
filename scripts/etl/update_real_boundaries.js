/**
 * Update database with real country boundaries from Natural Earth
 * Run: node scripts/etl/update_real_boundaries.js
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapping of ISO3 codes to our 2-letter codes
const isoMapping = {
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

async function updateCountryBoundaries() {
  console.log('📥 Loading Natural Earth GeoJSON data...');
  
  // Read the GeoJSON file
  const geojsonData = JSON.parse(
    fs.readFileSync('./scripts/etl/ne_110m_admin_0_countries.geojson', 'utf8')
  );

  console.log(`✅ Loaded ${geojsonData.features.length} country features`);

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
      } else {
        console.log(`✅ Updated ${countryName} (${regionCode})`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ Exception updating ${regionCode}:`, err);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updated} countries`);
  console.log(`⏭️  Skipped: ${skipped} countries`);
  console.log('\n🎉 Real country boundaries updated successfully!');
}

/**
 * Calculate approximate centroid from geometry
 * For simplicity, averages all coordinate points
 */
function calculateCentroid(geometry) {
  const coords = [];
  
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

// Run the update
updateCountryBoundaries().catch(console.error);
