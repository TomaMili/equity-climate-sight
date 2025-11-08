-- Update existing country records with ISO 2-letter codes for consistency
UPDATE climate_inequality_regions SET region_code = 'DE' WHERE region_code = 'DEU';
UPDATE climate_inequality_regions SET region_code = 'PL' WHERE region_code = 'POL';
UPDATE climate_inequality_regions SET region_code = 'FR' WHERE region_code = 'FRA';
UPDATE climate_inequality_regions SET region_code = 'ES' WHERE region_code = 'ESP';
UPDATE climate_inequality_regions SET region_code = 'IT' WHERE region_code = 'ITA';
UPDATE climate_inequality_regions SET region_code = 'GR' WHERE region_code = 'GRC';
UPDATE climate_inequality_regions SET region_code = 'RO' WHERE region_code = 'ROU';
UPDATE climate_inequality_regions SET region_code = 'BG' WHERE region_code = 'BGR';
UPDATE climate_inequality_regions SET region_code = 'GB' WHERE region_code = 'GBR';
UPDATE climate_inequality_regions SET region_code = 'NL' WHERE region_code = 'NLD';
UPDATE climate_inequality_regions SET region_code = 'SE' WHERE region_code = 'SWE';
UPDATE climate_inequality_regions SET region_code = 'PT' WHERE region_code = 'PRT';