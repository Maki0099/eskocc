ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_ytd_elevation integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalc_club_ytd()
 RETURNS TABLE(users_updated integer, users_zeroed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year_start timestamptz := date_trunc('year', now());
  v_now timestamptz := now();
  v_updated integer := 0;
  v_zeroed integer := 0;
BEGIN
  WITH totals AS (
    SELECT matched_user_id AS uid,
           COALESCE(SUM(distance_m), 0) AS dist_m,
           COALESCE(SUM(elevation_gain), 0) AS elev_m,
           COUNT(*) AS cnt
    FROM public.club_activities
    WHERE matched_user_id IS NOT NULL
      AND activity_date >= v_year_start
    GROUP BY matched_user_id
  ),
  upd AS (
    UPDATE public.profiles p
    SET strava_ytd_distance = ROUND(t.dist_m / 1000.0)::int,
        strava_ytd_count = t.cnt::int,
        strava_ytd_elevation = ROUND(t.elev_m)::int,
        strava_stats_cached_at = v_now
    FROM totals t
    WHERE p.id = t.uid
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  WITH zeroed AS (
    UPDATE public.profiles p
    SET strava_ytd_distance = 0,
        strava_ytd_count = 0,
        strava_ytd_elevation = 0,
        strava_stats_cached_at = v_now
    WHERE p.id IN (SELECT user_id FROM public.user_roles WHERE role IN ('member','active_member','admin'))
      AND p.id NOT IN (
        SELECT matched_user_id FROM public.club_activities
        WHERE matched_user_id IS NOT NULL AND activity_date >= v_year_start
      )
      AND (COALESCE(p.strava_ytd_distance, 0) <> 0 OR COALESCE(p.strava_ytd_count, 0) <> 0 OR COALESCE(p.strava_ytd_elevation, 0) <> 0)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_zeroed FROM zeroed;

  RETURN QUERY SELECT v_updated, v_zeroed;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_member_statistics();
CREATE FUNCTION public.get_member_statistics()
 RETURNS TABLE(id uuid, full_name text, nickname text, avatar_url text, strava_ytd_distance integer, strava_ytd_count integer, strava_ytd_elevation integer, age_category text, created_at timestamp with time zone)
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
    COALESCE(p.strava_ytd_elevation, 0) AS strava_ytd_elevation,
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

CREATE OR REPLACE FUNCTION public.get_public_club_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'members', (SELECT COUNT(*) FROM user_roles WHERE role IN ('member','active_member','admin')),
    'routes', (SELECT COUNT(*) FROM favorite_routes),
    'events_total', (SELECT COUNT(*) FROM events),
    'gallery_items', (SELECT COUNT(*) FROM gallery_items),
    'ytd_km', COALESCE((SELECT SUM(strava_ytd_distance) FROM profiles), 0),
    'ytd_rides', COALESCE((SELECT SUM(strava_ytd_count) FROM profiles), 0),
    'ytd_elevation', COALESCE((SELECT SUM(strava_ytd_elevation) FROM profiles), 0)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_club_teaser_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  current_year INT := EXTRACT(YEAR FROM NOW())::INT;
BEGIN
  SELECT json_build_object(
    'total_distance', COALESCE(SUM(p.strava_ytd_distance), 0),
    'total_elevation', COALESCE(SUM(p.strava_ytd_elevation), 0),
    'member_count', COUNT(DISTINCT ur.user_id),
    'target_distance', COALESCE(
      (SELECT club_total_target FROM yearly_challenge_settings WHERE year = current_year LIMIT 1),
      70000
    ),
    'top_riders', (
      SELECT COALESCE(json_agg(rider_data), '[]'::json)
      FROM (
        SELECT 
          LEFT(COALESCE(p2.nickname, p2.full_name, 'Člen'), 1) || '.' as initials,
          COALESCE(p2.strava_ytd_distance, 0) as distance
        FROM user_roles ur2
        LEFT JOIN profiles p2 ON p2.id = ur2.user_id
        WHERE ur2.role IN ('member', 'active_member', 'admin')
          AND COALESCE(p2.strava_ytd_distance, 0) > 0
        ORDER BY p2.strava_ytd_distance DESC NULLS LAST
        LIMIT 3
      ) as rider_data
    )
  )
  INTO result
  FROM user_roles ur
  LEFT JOIN profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('member', 'active_member', 'admin');
  
  RETURN result;
END;
$function$;

DROP VIEW IF EXISTS public.member_profiles_public;
CREATE VIEW public.member_profiles_public
WITH (security_invoker = true) AS
SELECT id, full_name, nickname, avatar_url, strava_ytd_distance, strava_ytd_count, strava_ytd_elevation, created_at
FROM public.profiles p;

GRANT SELECT ON public.member_profiles_public TO authenticated;

DROP FUNCTION IF EXISTS public.get_member_yearly_progress(uuid);
CREATE FUNCTION public.get_member_yearly_progress(_user_id uuid)
 RETURNS TABLE(day date, day_km numeric, cumulative_km numeric, target numeric, day_elevation numeric, cumulative_elevation numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target numeric;
  v_age_category text;
  v_year int := EXTRACT(YEAR FROM now())::int;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'member') OR
    has_role(auth.uid(), 'active_member') OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RETURN;
  END IF;

  SELECT CASE
    WHEN p.birth_date IS NULL THEN 'under_40'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 60 THEN 'over_60'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 40 THEN 'under_60'
    ELSE 'under_40'
  END
  INTO v_age_category
  FROM public.profiles p
  WHERE p.id = _user_id;

  SELECT CASE v_age_category
    WHEN 'over_60' THEN s.target_over_60
    WHEN 'under_60' THEN s.target_under_60
    ELSE s.target_under_40
  END
  INTO v_target
  FROM public.yearly_challenge_settings s
  WHERE s.year = v_year
  LIMIT 1;

  IF v_target IS NULL THEN
    v_target := 0;
  END IF;

  RETURN QUERY
  WITH daily AS (
    SELECT
      date_trunc('day', activity_date)::date AS d,
      SUM(distance_m)::numeric / 1000.0 AS km,
      SUM(COALESCE(elevation_gain, 0))::numeric AS elev
    FROM public.club_activities
    WHERE matched_user_id = _user_id
      AND activity_date >= date_trunc('year', now())
      AND activity_date < date_trunc('year', now()) + interval '1 year'
    GROUP BY 1
  )
  SELECT
    d AS day,
    ROUND(km, 1) AS day_km,
    ROUND(SUM(km) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cumulative_km,
    v_target AS target,
    ROUND(elev, 0) AS day_elevation,
    ROUND(SUM(elev) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0) AS cumulative_elevation
  FROM daily
  ORDER BY d;
END;
$function$;

SELECT public.recalc_club_ytd();