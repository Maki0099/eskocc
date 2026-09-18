
CREATE TABLE public.member_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strava_activity_id text NOT NULL,
  name text,
  activity_date timestamptz NOT NULL,
  distance_m integer NOT NULL DEFAULT 0,
  moving_time integer NOT NULL DEFAULT 0,
  elevation_gain integer NOT NULL DEFAULT 0,
  sport_type text,
  excluded_as_duplicate boolean NOT NULL DEFAULT false,
  excluded_at timestamptz,
  excluded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strava_activity_id)
);

GRANT SELECT ON public.member_activities TO authenticated;
GRANT ALL ON public.member_activities TO service_role;
ALTER TABLE public.member_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
ON public.member_activities FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activities"
ON public.member_activities FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_member_activities_user_date ON public.member_activities (user_id, activity_date);
CREATE INDEX idx_member_activities_excluded ON public.member_activities (excluded_as_duplicate);

CREATE TRIGGER trg_member_activities_updated
BEFORE UPDATE ON public.member_activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Přepočet ročních statistik z osobních jízd
CREATE OR REPLACE FUNCTION public.recalc_member_ytd()
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
    SELECT user_id AS uid,
           COALESCE(SUM(distance_m), 0) AS dist_m,
           COALESCE(SUM(elevation_gain), 0) AS elev_m,
           COUNT(*) AS cnt
    FROM public.member_activities
    WHERE activity_date >= v_year_start
      AND excluded_as_duplicate = false
    GROUP BY user_id
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
    WHERE p.id IN (SELECT user_id FROM public.user_strava_tokens)
      AND p.id NOT IN (
        SELECT user_id FROM public.member_activities
        WHERE activity_date >= v_year_start AND excluded_as_duplicate = false
      )
      AND (COALESCE(p.strava_ytd_distance, 0) <> 0 OR COALESCE(p.strava_ytd_count, 0) <> 0 OR COALESCE(p.strava_ytd_elevation, 0) <> 0)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_zeroed FROM zeroed;

  RETURN QUERY SELECT v_updated, v_zeroed;
END;
$function$;

REVOKE ALL ON FUNCTION public.recalc_member_ytd() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_member_ytd() TO service_role;

-- Statistiky členů + příznak propojení Stravy
DROP FUNCTION IF EXISTS public.get_member_statistics();
CREATE OR REPLACE FUNCTION public.get_member_statistics()
RETURNS TABLE(id uuid, full_name text, nickname text, avatar_url text, strava_ytd_distance integer, strava_ytd_count integer, strava_ytd_elevation integer, age_category text, created_at timestamp with time zone, is_connected boolean)
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
    p.created_at,
    EXISTS (SELECT 1 FROM public.user_strava_tokens t WHERE t.user_id = p.id AND t.needs_reauth = false) AS is_connected
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('member', 'active_member', 'admin');
END;
$function$;

-- Graf sezóny: osobní jízdy se skutečným datem, fallback na historická klubová data
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
  WITH src AS (
    SELECT ma.activity_date AS d, ma.distance_m, ma.elevation_gain
    FROM public.member_activities ma
    WHERE ma.user_id = _user_id
      AND ma.excluded_as_duplicate = false
      AND ma.activity_date >= date_trunc('year', now())
      AND ma.activity_date < date_trunc('year', now()) + interval '1 year'
    UNION ALL
    SELECT ca.activity_date, ca.distance_m, ca.elevation_gain
    FROM public.club_activities ca
    WHERE ca.matched_user_id = _user_id
      AND ca.excluded_as_duplicate = false
      AND ca.activity_date >= date_trunc('year', now())
      AND ca.activity_date < date_trunc('year', now()) + interval '1 year'
      AND NOT EXISTS (
        SELECT 1 FROM public.member_activities m2
        WHERE m2.user_id = _user_id
          AND m2.activity_date >= date_trunc('year', now())
      )
  ),
  daily AS (
    SELECT date_trunc('day', d)::date AS d,
           SUM(distance_m)::numeric / 1000.0 AS km,
           SUM(COALESCE(elevation_gain, 0))::numeric AS elev
    FROM src
    GROUP BY 1
  )
  SELECT
    daily.d AS day,
    ROUND(km, 1) AS day_km,
    ROUND(SUM(km) OVER (ORDER BY daily.d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cumulative_km,
    v_target AS target,
    ROUND(elev, 0) AS day_elevation,
    ROUND(SUM(elev) OVER (ORDER BY daily.d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 0) AS cumulative_elevation
  FROM daily
  ORDER BY daily.d;
END;
$function$;

-- Duplicity z osobních jízd (stejný člen, stejný skutečný den)
CREATE OR REPLACE FUNCTION public.get_member_duplicate_candidates()
RETURNS TABLE(a_id uuid, b_id uuid, user_id uuid, member_name text, a_distance_m integer, b_distance_m integer, a_moving_time integer, b_moving_time integer, a_elevation integer, b_elevation integer, a_sport_type text, b_sport_type text, a_date timestamp with time zone, b_date timestamp with time zone, a_excluded boolean, b_excluded boolean, likely_duplicate boolean)
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
    a.id, b.id, a.user_id,
    COALESCE(p.full_name, p.nickname, 'Člen') AS member_name,
    a.distance_m, b.distance_m,
    a.moving_time, b.moving_time,
    a.elevation_gain, b.elevation_gain,
    a.sport_type, b.sport_type,
    a.activity_date, b.activity_date,
    a.excluded_as_duplicate, b.excluded_as_duplicate,
    (abs(a.distance_m - b.distance_m) <= 500
     AND abs(a.moving_time - b.moving_time) <= 360
     AND (abs(a.elevation_gain - b.elevation_gain) <= 30
          OR abs(a.elevation_gain - b.elevation_gain) <= 0.1 * greatest(a.elevation_gain, b.elevation_gain))
    ) AS likely_duplicate
  FROM public.member_activities a
  JOIN public.member_activities b
    ON a.user_id = b.user_id
   AND a.id < b.id
   AND a.activity_date::date = b.activity_date::date
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.distance_m >= 1000 AND b.distance_m >= 1000
  ORDER BY likely_duplicate DESC, member_name, a.activity_date, a.distance_m DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_member_activity_duplicate(_id uuid, _excluded boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.member_activities
  SET excluded_as_duplicate = _excluded,
      excluded_at = CASE WHEN _excluded THEN now() ELSE NULL END,
      excluded_by = CASE WHEN _excluded THEN auth.uid() ELSE NULL END
  WHERE id = _id;

  PERFORM public.recalc_member_ytd();
END;
$function$;

REVOKE ALL ON FUNCTION public.get_member_duplicate_candidates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_member_activity_duplicate(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_duplicate_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_activity_duplicate(uuid, boolean) TO authenticated;

-- Přehled propojení pro admina
CREATE OR REPLACE FUNCTION public.get_member_strava_connections()
RETURNS TABLE(user_id uuid, full_name text, athlete_id text, needs_reauth boolean, last_synced_at timestamp with time zone, last_error text, activities_count bigint)
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
    p.id,
    COALESCE(p.full_name, p.nickname, 'Člen'),
    t.athlete_id,
    COALESCE(t.needs_reauth, false),
    t.last_synced_at,
    t.last_error,
    (SELECT COUNT(*) FROM public.member_activities ma
      WHERE ma.user_id = p.id
        AND ma.activity_date >= date_trunc('year', now()))
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.user_strava_tokens t ON t.user_id = p.id
  WHERE ur.role IN ('member', 'active_member', 'admin')
  ORDER BY (t.user_id IS NULL), COALESCE(p.full_name, p.nickname);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_member_strava_connections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_strava_connections() TO authenticated;
