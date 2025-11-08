-- Fix search_path for the initialization progress timestamp function
CREATE OR REPLACE FUNCTION public.update_initialization_progress_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;