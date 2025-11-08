-- Create table to track initialization progress
CREATE TABLE IF NOT EXISTS public.initialization_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'initializing',
  current_step TEXT,
  total_countries INTEGER DEFAULT 0,
  processed_countries INTEGER DEFAULT 0,
  total_regions INTEGER DEFAULT 0,
  processed_regions INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create or replace function to update timestamp
CREATE OR REPLACE FUNCTION public.update_initialization_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_initialization_progress_timestamp ON public.initialization_progress;
CREATE TRIGGER update_initialization_progress_timestamp
  BEFORE UPDATE ON public.initialization_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_initialization_progress_timestamp();

-- Make table accessible without auth for edge function updates
ALTER TABLE public.initialization_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to initialization progress"
  ON public.initialization_progress
  FOR SELECT
  USING (true);

CREATE POLICY "Allow service role to manage initialization progress"
  ON public.initialization_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);