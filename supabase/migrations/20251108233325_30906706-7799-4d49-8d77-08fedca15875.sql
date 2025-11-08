-- Add columns to store individual CII component scores
ALTER TABLE climate_inequality_regions
ADD COLUMN IF NOT EXISTS cii_climate_risk_component numeric,
ADD COLUMN IF NOT EXISTS cii_infrastructure_gap_component numeric,
ADD COLUMN IF NOT EXISTS cii_socioeconomic_vuln_component numeric,
ADD COLUMN IF NOT EXISTS cii_air_quality_component numeric;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_climate_inequality_regions_cii_components 
ON climate_inequality_regions(cii_climate_risk_component, cii_infrastructure_gap_component, cii_socioeconomic_vuln_component, cii_air_quality_component);