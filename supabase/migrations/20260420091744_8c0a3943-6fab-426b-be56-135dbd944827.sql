
-- 1. Recreate member_profiles_public view without removed columns
DROP VIEW IF EXISTS public.member_profiles_public;

-- 2. Drop functions that reference columns to be removed
DROP FUNCTION IF EXISTS public.get_member_statistics();

-- 3. Remove old personal Strava columns from profiles, add club_match_name, reset YTD
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS strava_access_token,
  DROP COLUMN IF EXISTS strava_refresh_token,
  DROP COLUMN IF EXISTS strava_token_expires_at,
  DROP COLUMN IF EXISTS strava_id,
  DROP COLUMN IF EXISTS strava_monthly_stats,
  DROP COLUMN IF EXISTS is_strava_club_member,
  ADD COLUMN IF NOT EXISTS club_match_name TEXT;

UPDATE public.profiles
SET strava_ytd_distance = 0,
    strava_ytd_count = 0,
    strava_stats_cached_at = NULL;

-- 4. Recreate member_profiles_public view (security_invoker)
CREATE VIEW public.member_profiles_public
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.full_name,
  p.nickname,
  p.avatar_url,
  p.strava_ytd_distance,
  p.strava_ytd_count,
  p.created_at
FROM public.profiles p;

-- 5. club_activities table
CREATE TABLE public.club_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_firstname TEXT NOT NULL,
  athlete_lastname_initial TEXT,
  athlete_full TEXT NOT NULL,
  matched_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_date TIMESTAMPTZ NOT NULL,
  distance_m INTEGER NOT NULL DEFAULT 0,
  moving_time INTEGER NOT NULL DEFAULT 0,
  elevation_gain INTEGER NOT NULL DEFAULT 0,
  sport_type TEXT,
  fingerprint TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_activities_matched_user ON public.club_activities(matched_user_id);
CREATE INDEX idx_club_activities_date ON public.club_activities(activity_date DESC);

ALTER TABLE public.club_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view club activities"
ON public.club_activities FOR SELECT
USING (
  has_role(auth.uid(), 'member'::app_role) OR
  has_role(auth.uid(), 'active_member'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage club activities"
ON public.club_activities FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. club_api_credentials table (single row)
CREATE TABLE public.club_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  athlete_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.club_api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view club credentials"
ON public.club_api_credentials FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update club credentials"
ON public.club_api_credentials FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Recreate get_member_statistics without strava_id / is_strava_club_member
CREATE OR REPLACE FUNCTION public.get_member_statistics()
RETURNS TABLE(
  id uuid,
  full_name text,
  nickname text,
  avatar_url text,
  strava_ytd_distance integer,
  strava_ytd_count integer,
  age_category text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'member') OR
    has_role(auth.uid(), 'active_member') OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.nickname,
    p.avatar_url,
    COALESCE(p.strava_ytd_distance, 0) AS strava_ytd_distance,
    COALESCE(p.strava_ytd_count, 0) AS strava_ytd_count,
    CASE
      WHEN p.birth_date IS NULL THEN 'under_40'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 60 THEN 'over_60'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 40 THEN 'under_60'
      ELSE 'under_40'
    END AS age_category,
    p.created_at
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('member', 'active_member', 'admin');
END;
$function$;

-- get_top_members and get_club_teaser_stats already don't reference removed columns; leave as-is.
