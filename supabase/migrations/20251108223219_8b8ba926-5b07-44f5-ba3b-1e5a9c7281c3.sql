-- Drop and recreate the initialization_progress table with correct columns
DROP TABLE IF EXISTS public.initialization_progress CASCADE;

CREATE TABLE public.initialization_progress (
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

-- Enable RLS
ALTER TABLE public.initialization_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to initialization progress"
  ON public.initialization_progress
  FOR SELECT
  USING (true);

CREATE POLICY "Allow service role to manage initialization progress"
  ON public.initialization_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for timestamp
CREATE TRIGGER update_initialization_progress_timestamp
  BEFORE UPDATE ON public.initialization_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_initialization_progress_timestamp();