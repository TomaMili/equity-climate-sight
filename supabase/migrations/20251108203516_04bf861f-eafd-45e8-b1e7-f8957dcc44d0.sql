-- Fix the update function to set search_path for security
CREATE OR REPLACE FUNCTION public.update_climate_inequality_updated_at()
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