-- 1. Reauth flag on club credentials
ALTER TABLE public.club_api_credentials
  ADD COLUMN IF NOT EXISTS needs_reauth boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_error text;

-- 2. Sync log table
CREATE TABLE IF NOT EXISTS public.club_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  fetched_count integer NOT NULL DEFAULT 0,
  new_activities integer NOT NULL DEFAULT 0,
  new_athletes integer NOT NULL DEFAULT 0,
  ytd_users_updated integer NOT NULL DEFAULT 0,
  ytd_users_zeroed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  triggered_by text
);

CREATE INDEX IF NOT EXISTS club_sync_log_started_at_idx
  ON public.club_sync_log (started_at DESC);

ALTER TABLE public.club_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync log"
  ON public.club_sync_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));