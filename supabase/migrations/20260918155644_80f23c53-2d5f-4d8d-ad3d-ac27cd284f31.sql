ALTER TABLE public.member_activities
  ADD COLUMN IF NOT EXISTS elapsed_time integer,
  ADD COLUMN IF NOT EXISTS average_speed numeric,
  ADD COLUMN IF NOT EXISTS max_speed numeric,
  ADD COLUMN IF NOT EXISTS average_heartrate numeric,
  ADD COLUMN IF NOT EXISTS max_heartrate numeric,
  ADD COLUMN IF NOT EXISTS average_watts numeric,
  ADD COLUMN IF NOT EXISTS average_cadence numeric,
  ADD COLUMN IF NOT EXISTS calories numeric,
  ADD COLUMN IF NOT EXISTS suffer_score integer,
  ADD COLUMN IF NOT EXISTS is_trainer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_commute boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_race boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_lat numeric,
  ADD COLUMN IF NOT EXISTS start_lng numeric,
  ADD COLUMN IF NOT EXISTS map_polyline text;

-- Heatmapa aktivity za rok
CREATE OR REPLACE FUNCTION public.get_member_activity_heatmap(_user_id uuid, _year integer DEFAULT NULL)
RETURNS TABLE(day date, km numeric, elevation numeric, rides integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (ma.activity_date AT TIME ZONE 'Europe/Prague')::date AS day,
         ROUND(SUM(ma.distance_m) / 1000.0, 1) AS km,
         SUM(ma.elevation_gain)::numeric AS elevation,
         COUNT(*)::int AS rides
  FROM public.member_activities ma
  WHERE ma.user_id = _user_id
    AND ma.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM (ma.activity_date AT TIME ZONE 'Europe/Prague')) = COALESCE(_year, EXTRACT(YEAR FROM now())::int)
  GROUP BY 1
  ORDER BY 1;
$$;

-- Rozpad podle typu sportu
CREATE OR REPLACE FUNCTION public.get_member_sport_breakdown(_user_id uuid, _year integer DEFAULT NULL)
RETURNS TABLE(sport_type text, km numeric, elevation numeric, rides integer, moving_time bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ma.sport_type, 'Ostatní') AS sport_type,
         ROUND(SUM(ma.distance_m) / 1000.0, 1) AS km,
         SUM(ma.elevation_gain)::numeric AS elevation,
         COUNT(*)::int AS rides,
         SUM(ma.moving_time)::bigint AS moving_time
  FROM public.member_activities ma
  WHERE ma.user_id = _user_id
    AND ma.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM (ma.activity_date AT TIME ZONE 'Europe/Prague')) = COALESCE(_year, EXTRACT(YEAR FROM now())::int)
  GROUP BY 1
  ORDER BY km DESC;
$$;

-- Souhrnné ukazatele člena
CREATE OR REPLACE FUNCTION public.get_member_highlights(_user_id uuid, _year integer DEFAULT NULL)
RETURNS TABLE(
  rides integer,
  total_km numeric,
  total_elevation numeric,
  moving_time bigint,
  longest_ride_km numeric,
  longest_ride_date date,
  biggest_climb_m numeric,
  biggest_climb_date date,
  avg_speed_kmh numeric,
  max_speed_kmh numeric,
  avg_heartrate numeric,
  total_calories numeric,
  best_month integer,
  best_month_km numeric,
  active_days integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH y AS (
    SELECT COALESCE(_year, EXTRACT(YEAR FROM now())::int) AS yr
  ),
  a AS (
    SELECT ma.*, (ma.activity_date AT TIME ZONE 'Europe/Prague')::date AS d
    FROM public.member_activities ma, y
    WHERE ma.user_id = _user_id
      AND ma.excluded_as_duplicate = false
      AND EXTRACT(YEAR FROM (ma.activity_date AT TIME ZONE 'Europe/Prague')) = y.yr
  ),
  longest AS (SELECT d, distance_m FROM a ORDER BY distance_m DESC NULLS LAST LIMIT 1),
  climb AS (SELECT d, elevation_gain FROM a ORDER BY elevation_gain DESC NULLS LAST LIMIT 1),
  months AS (
    SELECT EXTRACT(MONTH FROM d)::int AS m, SUM(distance_m) / 1000.0 AS km
    FROM a GROUP BY 1 ORDER BY km DESC LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::int FROM a),
    (SELECT ROUND(COALESCE(SUM(distance_m), 0) / 1000.0, 1) FROM a),
    (SELECT COALESCE(SUM(elevation_gain), 0)::numeric FROM a),
    (SELECT COALESCE(SUM(moving_time), 0)::bigint FROM a),
    (SELECT ROUND(distance_m / 1000.0, 1) FROM longest),
    (SELECT d FROM longest),
    (SELECT elevation_gain::numeric FROM climb),
    (SELECT d FROM climb),
    (SELECT CASE WHEN COALESCE(SUM(moving_time), 0) > 0
                 THEN ROUND((SUM(distance_m) / NULLIF(SUM(moving_time), 0)) * 3.6, 1) END FROM a),
    (SELECT ROUND(MAX(max_speed) * 3.6, 1) FROM a),
    (SELECT ROUND(AVG(average_heartrate)) FROM a WHERE average_heartrate IS NOT NULL),
    (SELECT ROUND(COALESCE(SUM(calories), 0)) FROM a),
    (SELECT m FROM months),
    (SELECT ROUND(km, 1) FROM months),
    (SELECT COUNT(DISTINCT d)::int FROM a);
$$;

REVOKE EXECUTE ON FUNCTION public.get_member_activity_heatmap(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_member_sport_breakdown(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_member_highlights(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_activity_heatmap(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_sport_breakdown(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_highlights(uuid, integer) TO authenticated;