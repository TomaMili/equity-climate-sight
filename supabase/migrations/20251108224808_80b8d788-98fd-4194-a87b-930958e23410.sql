-- Fix search_path security issue for cron management functions

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS public.get_cron_jobs();
DROP FUNCTION IF EXISTS public.toggle_cron_job(bigint, boolean);
DROP FUNCTION IF EXISTS public.delete_cron_job(bigint);

-- Function to get all cron jobs
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  jobname text,
  active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT jobid, schedule, command, jobname, active
  FROM cron.job
  ORDER BY jobid;
$$;

-- Function to toggle cron job active state
CREATE OR REPLACE FUNCTION public.toggle_cron_job(
  job_id bigint,
  new_active_state boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  UPDATE cron.job
  SET active = new_active_state
  WHERE jobid = job_id;
END;
$$;

-- Function to delete cron job
CREATE OR REPLACE FUNCTION public.delete_cron_job(job_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  PERFORM cron.unschedule(job_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.toggle_cron_job(bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_cron_job(bigint) TO authenticated;
