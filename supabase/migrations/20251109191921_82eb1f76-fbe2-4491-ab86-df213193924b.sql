-- Add retry tracking columns to climate_inequality_regions table
ALTER TABLE climate_inequality_regions 
ADD COLUMN IF NOT EXISTS enrichment_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_enrichment_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS enrichment_error TEXT;