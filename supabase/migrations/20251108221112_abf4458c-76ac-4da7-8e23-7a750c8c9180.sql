-- Add unique constraint for upsert operations
ALTER TABLE climate_inequality_regions 
ADD CONSTRAINT climate_inequality_regions_region_code_data_year_key 
UNIQUE (region_code, data_year);