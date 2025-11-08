-- Fix unique constraint so we can store one record per region per year
-- 1) Drop existing unique constraint on region_code (conflicts across years)
ALTER TABLE public.climate_inequality_regions
DROP CONSTRAINT IF EXISTS climate_inequality_regions_region_code_key;

-- 2) Add composite unique constraint (region_code, data_year)
ALTER TABLE public.climate_inequality_regions
ADD CONSTRAINT climate_inequality_regions_region_code_year_key UNIQUE (region_code, data_year);

-- 3) Helpful index for year filtering in UI
CREATE INDEX IF NOT EXISTS idx_climate_inequality_regions_year ON public.climate_inequality_regions (data_year);
