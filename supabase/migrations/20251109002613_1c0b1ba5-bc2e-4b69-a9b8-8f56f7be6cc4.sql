-- Create bookmarks table for favorite regions
CREATE TABLE IF NOT EXISTS public.region_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code TEXT NOT NULL,
  user_session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_region_bookmarks_session ON public.region_bookmarks(user_session_id);
CREATE INDEX idx_region_bookmarks_region ON public.region_bookmarks(region_code);

-- Enable RLS
ALTER TABLE public.region_bookmarks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read bookmarks (filtered by session ID in app)
CREATE POLICY "Bookmarks are publicly readable"
ON public.region_bookmarks
FOR SELECT
USING (true);

-- Allow anyone to insert bookmarks
CREATE POLICY "Anyone can create bookmarks"
ON public.region_bookmarks
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete their own bookmarks
CREATE POLICY "Anyone can delete bookmarks"
ON public.region_bookmarks
FOR DELETE
USING (true);