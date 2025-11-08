-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create table for storing Climate Inequality Index data
CREATE TABLE public.climate_inequality_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  h3_index TEXT NOT NULL UNIQUE,
  region_name TEXT,
  country TEXT,
  cii_score DECIMAL(3,2) NOT NULL CHECK (cii_score >= 0 AND cii_score <= 1),
  climate_risk_score DECIMAL(3,2) CHECK (climate_risk_score >= 0 AND climate_risk_score <= 1),
  infrastructure_score DECIMAL(3,2) CHECK (infrastructure_score >= 0 AND infrastructure_score <= 1),
  socioeconomic_score DECIMAL(3,2) CHECK (socioeconomic_score >= 0 AND socioeconomic_score <= 1),
  population INTEGER,
  air_quality_pm25 DECIMAL(6,2),
  internet_connectivity_mbps DECIMAL(8,2),
  geometry GEOMETRY(Polygon, 4326),
  data_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on H3 index for fast lookups
CREATE INDEX idx_climate_inequality_h3 ON public.climate_inequality_data(h3_index);

-- Create spatial index for geometry queries
CREATE INDEX idx_climate_inequality_geom ON public.climate_inequality_data USING GIST(geometry);

-- Create index on CII score for filtering
CREATE INDEX idx_climate_inequality_cii ON public.climate_inequality_data(cii_score);

-- Create index on year for time-based queries
CREATE INDEX idx_climate_inequality_year ON public.climate_inequality_data(data_year);

-- Enable RLS
ALTER TABLE public.climate_inequality_data ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (this is a public data visualization app)
CREATE POLICY "Climate data is publicly readable"
  ON public.climate_inequality_data
  FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_climate_inequality_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_climate_inequality_timestamp
  BEFORE UPDATE ON public.climate_inequality_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_climate_inequality_updated_at();