ALTER TABLE public.club_activities
  ADD COLUMN IF NOT EXISTS excluded_as_duplicate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluded_at timestamptz,
  ADD COLUMN IF NOT EXISTS excluded_by uuid;

CREATE INDEX IF NOT EXISTS idx_club_activities_excluded
  ON public.club_activities (matched_user_id, excluded_as_duplicate);

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
      AND excluded_as_duplicate = false
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
          AND excluded_as_duplicate = false
      )
      AND (COALESCE(p.strava_ytd_distance, 0) <> 0 OR COALESCE(p.strava_ytd_count, 0) <> 0 OR COALESCE(p.strava_ytd_elevation, 0) <> 0)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_zeroed FROM zeroed;

  RETURN QUERY SELECT v_updated, v_zeroed;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_member_yearly_progress(_user_id uuid)
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
      AND excluded_as_duplicate = false
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

CREATE OR REPLACE FUNCTION public.get_duplicate_activity_candidates()
 RETURNS TABLE(
   a_id uuid, b_id uuid,
   athlete_full text, matched_user_id uuid,
   a_distance_m integer, b_distance_m integer,
   a_moving_time integer, b_moving_time integer,
   a_elevation integer, b_elevation integer,
   a_sport_type text, b_sport_type text,
   a_date timestamptz, b_date timestamptz,
   a_excluded boolean, b_excluded boolean
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id, b.id,
    a.athlete_full, a.matched_user_id,
    a.distance_m, b.distance_m,
    a.moving_time, b.moving_time,
    a.elevation_gain, b.elevation_gain,
    a.sport_type, b.sport_type,
    a.activity_date, b.activity_date,
    a.excluded_as_duplicate, b.excluded_as_duplicate
  FROM public.club_activities a
  JOIN public.club_activities b
    ON a.athlete_full = b.athlete_full
   AND a.id < b.id
   AND abs(a.distance_m - b.distance_m) <= 50
   AND abs(COALESCE(a.elevation_gain,0) - COALESCE(b.elevation_gain,0)) <= 10
   AND COALESCE(a.sport_type,'') = COALESCE(b.sport_type,'')
  WHERE a.distance_m >= 1000
    AND b.distance_m >= 1000
  ORDER BY a.athlete_full, a.distance_m DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_activity_duplicate(_id uuid, _excluded boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.club_activities
  SET excluded_as_duplicate = _excluded,
      excluded_at = CASE WHEN _excluded THEN now() ELSE NULL END,
      excluded_by = CASE WHEN _excluded THEN auth.uid() ELSE NULL END
  WHERE id = _id;

  PERFORM public.recalc_club_ytd();
END;
$function$;

REVOKE ALL ON FUNCTION public.get_duplicate_activity_candidates() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_activity_duplicate(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_duplicate_activity_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_activity_duplicate(uuid, boolean) TO authenticated;