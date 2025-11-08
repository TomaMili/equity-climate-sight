-- Create helper functions to manage cron jobs

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
AS $$
BEGIN
  PERFORM cron.unschedule(job_id);
END;
$$;

-- Grant execute permissions to authenticated users (you may want to restrict this further)
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.toggle_cron_job(bigint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_cron_job(bigint) TO authenticated;
