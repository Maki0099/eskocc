DROP FUNCTION IF EXISTS public.get_cron_jobs();

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text,
  last_run_at timestamptz,
  last_run_status text,
  last_run_duration_ms integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname,
    last_run.start_time AS last_run_at,
    last_run.status AS last_run_status,
    CASE
      WHEN last_run.end_time IS NOT NULL AND last_run.start_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (last_run.end_time - last_run.start_time))::int * 1000
      ELSE NULL
    END AS last_run_duration_ms
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT d.start_time, d.end_time, d.status
    FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY d.start_time DESC
    LIMIT 1
  ) last_run ON true;
END;
$function$;