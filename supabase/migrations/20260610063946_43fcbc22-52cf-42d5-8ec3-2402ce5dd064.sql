
-- 1) per-user Strava tokens
CREATE TABLE public.user_strava_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  needs_reauth boolean NOT NULL DEFAULT false,
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_strava_tokens TO authenticated;
GRANT ALL ON public.user_strava_tokens TO service_role;

ALTER TABLE public.user_strava_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own strava tokens"
  ON public.user_strava_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all strava tokens"
  ON public.user_strava_tokens
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_user_strava_tokens_updated
  BEFORE UPDATE ON public.user_strava_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) personal YTD fields on profiles (paralelní vedle klubových)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_ytd_distance integer,
  ADD COLUMN IF NOT EXISTS personal_ytd_count integer,
  ADD COLUMN IF NOT EXISTS personal_stats_cached_at timestamptz;
