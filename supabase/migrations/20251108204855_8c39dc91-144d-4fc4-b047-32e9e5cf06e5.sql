-- Drop the old table and create a new one for country/region-based data
DROP TABLE IF EXISTS public.climate_inequality_data CASCADE;

-- Create new table for region-based climate inequality data
CREATE TABLE public.climate_inequality_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL UNIQUE, -- ISO codes like 'DEU', 'FRA', etc.
  region_name TEXT NOT NULL,
  region_type TEXT NOT NULL, -- 'country', 'state', 'province'
  country TEXT NOT NULL,
  cii_score DECIMAL(4,3) NOT NULL CHECK (cii_score >= 0 AND cii_score <= 1),
  
  -- Component scores
  climate_risk_score DECIMAL(4,3) CHECK (climate_risk_score >= 0 AND climate_risk_score <= 1),
  infrastructure_score DECIMAL(4,3) CHECK (infrastructure_score >= 0 AND infrastructure_score <= 1),
  socioeconomic_score DECIMAL(4,3) CHECK (socioeconomic_score >= 0 AND socioeconomic_score <= 1),
  
  -- ASDI data points
  air_quality_pm25 DECIMAL(6,2), -- From OpenAQ
  air_quality_no2 DECIMAL(6,2), -- From NASA OMI
  internet_speed_download DECIMAL(8,2), -- From Ookla (Mbps)
  internet_speed_upload DECIMAL(8,2), -- From Ookla (Mbps)
  temperature_avg DECIMAL(5,2), -- From ERA5 (Celsius)
  precipitation_avg DECIMAL(7,2), -- From ERA5 (mm)
  drought_index DECIMAL(5,3), -- From Global Drought Catalogue
  flood_risk_score DECIMAL(4,3), -- Calculated from flood data
  
  -- Demographics
  population INTEGER,
  gdp_per_capita DECIMAL(10,2),
  urban_population_percent DECIMAL(5,2),
  
  -- Geometry for map visualization
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  centroid GEOMETRY(Point, 4326),
  
  -- Metadata
  data_year INTEGER NOT NULL,
  data_sources TEXT[], -- Array of ASDI dataset names used
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_regions_code ON public.climate_inequality_regions(region_code);
CREATE INDEX idx_regions_country ON public.climate_inequality_regions(country);
CREATE INDEX idx_regions_cii ON public.climate_inequality_regions(cii_score);
CREATE INDEX idx_regions_year ON public.climate_inequality_regions(data_year);
CREATE INDEX idx_regions_geom ON public.climate_inequality_regions USING GIST(geometry);
CREATE INDEX idx_regions_centroid ON public.climate_inequality_regions USING GIST(centroid);

-- Enable RLS
ALTER TABLE public.climate_inequality_regions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Climate region data is publicly readable"
  ON public.climate_inequality_regions
  FOR SELECT
  USING (true);

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION public.update_regions_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_regions_timestamp
  BEFORE UPDATE ON public.climate_inequality_regions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_regions_timestamp();