-- Clean up invalid population data for regions
-- Set population to NULL where it's negative or unreasonably large
UPDATE climate_inequality_regions
SET 
  population = NULL,
  data_sources = array_remove(data_sources, 'GeoNames')
WHERE 
  region_type = 'region'
  AND (
    population < 0 
    OR population > 2000000000
    OR population IS NOT NULL AND population::text ~ '[^0-9]'  -- Contains non-numeric characters
  );

-- Log the cleanup
DO $$
DECLARE
  cleaned_count integer;
BEGIN
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % regions with invalid population data', cleaned_count;
END $$;