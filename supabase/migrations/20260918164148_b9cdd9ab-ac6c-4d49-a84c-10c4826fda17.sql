-- 1) Klubové rekordy za rok
CREATE OR REPLACE FUNCTION public.get_club_records(_year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(record_key text, label text, user_id uuid, full_name text, avatar_url text, value text, activity_date date, activity_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH acts AS (
    SELECT a.*, p.full_name, p.avatar_url
    FROM public.member_activities a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.excluded_as_duplicate = false
      AND EXTRACT(YEAR FROM a.activity_date) = _year
  )
  (
    SELECT 'longest'::text AS record_key,
           'Nejdelší jízda'::text AS label,
           a.user_id, a.full_name, a.avatar_url,
           ROUND(a.distance_m/1000.0, 1)::text || ' km'::text AS value,
           a.activity_date::date,
           a.name AS activity_name
    FROM acts a
    ORDER BY a.distance_m DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT 'elevation'::text, 'Největší převýšení v jízdě'::text,
           a.user_id, a.full_name, a.avatar_url,
           a.elevation_gain::text || ' m'::text,
           a.activity_date::date,
           a.name
    FROM acts a
    ORDER BY a.elevation_gain DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT 'fastest'::text, 'Nejrychlejší průměrná rychlost'::text,
           a.user_id, a.full_name, a.avatar_url,
           ROUND((a.average_speed * 3.6)::numeric, 1)::text || ' km/h'::text,
           a.activity_date::date,
           a.name
    FROM acts a
    WHERE a.average_speed IS NOT NULL AND a.distance_m >= 20000
    ORDER BY a.average_speed DESC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT 'calories'::text, 'Nejvíce kalorií v jízdě'::text,
           a.user_id, a.full_name, a.avatar_url,
           ROUND(a.calories, 0)::text || ' kcal'::text,
           a.activity_date::date,
           a.name
    FROM acts a
    WHERE a.calories IS NOT NULL
    ORDER BY a.calories DESC
    LIMIT 1
  );
$$;
REVOKE ALL ON FUNCTION public.get_club_records(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_records(integer) TO authenticated;

-- 2) Měsíční žebříček
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(_year integer DEFAULT EXTRACT(YEAR FROM now())::integer, _month integer DEFAULT EXTRACT(MONTH FROM now())::integer)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, km numeric, elevation numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url,
         COALESCE(SUM(a.distance_m), 0) / 1000.0 AS km,
         COALESCE(SUM(a.elevation_gain), 0) AS elevation,
         COUNT(a.id)::integer AS rides
  FROM public.profiles p
  JOIN public.member_activities a ON a.user_id = p.id
  WHERE a.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM a.activity_date) = _year
    AND EXTRACT(MONTH FROM a.activity_date) = _month
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY km DESC;
$$;
REVOKE ALL ON FUNCTION public.get_monthly_leaderboard(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_leaderboard(integer, integer) TO authenticated;

-- 3) Série pravidelnosti (počet po sobě jdoucích týdnů s jízdou)
CREATE OR REPLACE FUNCTION public.get_member_consistency_streak(_user_id uuid, _year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(current_streak integer, longest_streak integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH weeks AS (
    SELECT DISTINCT date_trunc('week', activity_date) AS week_start
    FROM public.member_activities
    WHERE user_id = _user_id
      AND excluded_as_duplicate = false
      AND EXTRACT(YEAR FROM activity_date) = _year
  ),
  grouped AS (
    SELECT (EXTRACT(YEAR FROM week_start)::integer * 100
            + EXTRACT(WEEK FROM week_start)::integer
            - row_number() OVER (ORDER BY week_start)) AS grp
    FROM weeks
  ),
  streaks AS (
    SELECT grp, COUNT(*) AS len
    FROM grouped
    GROUP BY grp
  )
  SELECT COALESCE((SELECT len FROM streaks ORDER BY grp DESC LIMIT 1), 0)::integer AS current_streak,
         COALESCE((SELECT len FROM streaks ORDER BY len DESC LIMIT 1), 0)::integer AS longest_streak;
$$;
REVOKE ALL ON FUNCTION public.get_member_consistency_streak(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_consistency_streak(uuid, integer) TO authenticated;

-- 4) Odznaky rozšířené o sérii pravidelnosti
CREATE OR REPLACE FUNCTION public.get_member_badges(_user_id uuid)
RETURNS TABLE(badge_key text, label text, detail text, earned_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH acts AS (
    SELECT * FROM public.member_activities
    WHERE user_id = _user_id AND excluded_as_duplicate = false
  ),
  stovka AS (
    SELECT 'stovka'::text AS badge_key, 'Stovka'::text AS label,
           ('Jízda přes 100 km (' || ROUND(MAX(distance_m)/1000.0) || ' km)')::text AS detail,
           MAX(activity_date) FILTER (WHERE distance_m >= 100000) AS earned_at
    FROM acts WHERE distance_m >= 100000
  ),
  horolezec AS (
    SELECT 'horolezec'::text, 'Horolezec'::text,
           ('Jízda s 2000+ m převýšení (' || MAX(elevation_gain) || ' m)')::text,
           MAX(activity_date) AS earned_at
    FROM acts WHERE elevation_gain >= 2000
  ),
  brzy_rano AS (
    SELECT 'brzy_rano'::text, 'Brzy ráno'::text,
           'Jízda začínající před 6:00'::text,
           MAX(activity_date) AS earned_at
    FROM acts WHERE EXTRACT(HOUR FROM activity_date) < 6
  ),
  pravidelnost AS (
    SELECT 'pravidelnost'::text, 'Pravidelnost'::text,
           ('Jízda každý týden v měsíci (' || TO_CHAR(month_start, 'FMMonth YYYY') || ')')::text,
           month_start::timestamptz AS earned_at
    FROM (
      SELECT date_trunc('month', activity_date)::date AS month_start,
             COUNT(DISTINCT date_trunc('week', activity_date)) AS weeks
      FROM acts
      GROUP BY 1
      HAVING COUNT(DISTINCT date_trunc('week', activity_date)) >= 4
      ORDER BY 1 DESC
      LIMIT 1
    ) m
  ),
  serye AS (
    SELECT 'serye'::text, 'Série'::text,
           ('' || current_streak || ' týdnů v řadě s jízdou')::text,
           (SELECT MAX(activity_date) FROM acts WHERE EXTRACT(YEAR FROM activity_date) = EXTRACT(YEAR FROM now())) AS earned_at
    FROM public.get_member_consistency_streak(_user_id)
    WHERE current_streak >= 4
  )
  SELECT * FROM stovka WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM horolezec WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM brzy_rano WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM pravidelnost WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM serye WHERE earned_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_member_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_badges(uuid) TO authenticated;

-- 5) Tepové zóny odhadnuté z věku (220 - věk), fallback 180 BPM
CREATE OR REPLACE FUNCTION public.get_member_heart_rate_zones(_user_id uuid, _year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(zone_label text, zone_min integer, zone_max integer, minutes numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH age AS (
    SELECT GREATEST(18, EXTRACT(YEAR FROM age(now(), p.birth_date))::integer) AS years
    FROM public.profiles p
    WHERE p.id = _user_id AND p.birth_date IS NOT NULL
    LIMIT 1
  ),
  maxhr AS (
    SELECT COALESCE((SELECT (220 - years) FROM age), 180) AS hr_max
  ),
  zones AS (
    SELECT 'Odpočinek (<50%)'::text AS zone_label, 0 AS zmin, 0.50 AS zmax
    UNION ALL SELECT 'Aerobní (50–70%)', 0.50, 0.70
    UNION ALL SELECT 'Tempo (70–80%)', 0.70, 0.80
    UNION ALL SELECT 'Anaerobní (80–90%)', 0.80, 0.90
    UNION ALL SELECT 'VO2max (90–100%)', 0.90, 1.00
  )
  SELECT z.zone_label,
         ROUND(z.zmin * m.hr_max)::integer AS zone_min,
         ROUND(z.zmax * m.hr_max)::integer AS zone_max,
         COALESCE(SUM(a.moving_time) FILTER (WHERE a.average_heartrate >= ROUND(z.zmin * m.hr_max)
                                              AND a.average_heartrate < ROUND(z.zmax * m.hr_max)), 0) / 60.0 AS minutes,
         COUNT(a.id) FILTER (WHERE a.average_heartrate >= ROUND(z.zmin * m.hr_max)
                              AND a.average_heartrate < ROUND(z.zmax * m.hr_max))::integer AS rides
  FROM zones z
  CROSS JOIN maxhr m
  LEFT JOIN public.member_activities a
    ON a.user_id = _user_id
   AND a.excluded_as_duplicate = false
   AND EXTRACT(YEAR FROM a.activity_date) = _year
   AND a.average_heartrate IS NOT NULL
  GROUP BY z.zone_label, z.zmin, z.zmax, m.hr_max
  ORDER BY z.zmin;
$$;
REVOKE ALL ON FUNCTION public.get_member_heart_rate_zones(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_heart_rate_zones(uuid, integer) TO authenticated;

-- 6) Výkonnostní trend (watty) po měsících
CREATE OR REPLACE FUNCTION public.get_member_power_trend(_user_id uuid, _year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(month integer, avg_watts numeric, max_watts numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXTRACT(MONTH FROM activity_date)::integer AS month,
         ROUND(AVG(average_watts), 0) AS avg_watts,
         ROUND(MAX(average_watts), 0) AS max_watts,
         COUNT(*)::integer AS rides
  FROM public.member_activities
  WHERE user_id = _user_id
    AND excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM activity_date) = _year
    AND average_watts IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.get_member_power_trend(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_power_trend(uuid, integer) TO authenticated;

-- 7) Kalorie po měsících
CREATE OR REPLACE FUNCTION public.get_member_calories_monthly(_user_id uuid, _year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(month integer, calories numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXTRACT(MONTH FROM activity_date)::integer AS month,
         ROUND(SUM(calories), 0) AS calories,
         COUNT(*)::integer AS rides
  FROM public.member_activities
  WHERE user_id = _user_id
    AND excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM activity_date) = _year
    AND calories IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.get_member_calories_monthly(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_calories_monthly(uuid, integer) TO authenticated;

-- 8) Poměr trenažér vs venku
CREATE OR REPLACE FUNCTION public.get_member_trainer_ratio(_user_id uuid, _year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(category text, km numeric, rides integer, minutes numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 'Venku'::text AS category,
         ROUND(SUM(distance_m)/1000.0, 1) AS km,
         COUNT(*)::integer AS rides,
         ROUND(SUM(moving_time)/60.0, 1) AS minutes
  FROM public.member_activities
  WHERE user_id = _user_id
    AND excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM activity_date) = _year
    AND is_trainer = false
  UNION ALL
  SELECT 'Trenažér'::text,
         ROUND(SUM(distance_m)/1000.0, 1),
         COUNT(*)::integer,
         ROUND(SUM(moving_time)/60.0, 1)
  FROM public.member_activities
  WHERE user_id = _user_id
    AND excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM activity_date) = _year
    AND is_trainer = true;
$$;
REVOKE ALL ON FUNCTION public.get_member_trainer_ratio(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_trainer_ratio(uuid, integer) TO authenticated;

-- 9) Polyliny tras klubu pro mapu
CREATE OR REPLACE FUNCTION public.get_club_activity_polylines(_days integer DEFAULT 90)
RETURNS TABLE(user_id uuid, full_name text, activity_date date, distance_km numeric, map_polyline text, start_lat numeric, start_lng numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.user_id, p.full_name, a.activity_date::date,
         ROUND(a.distance_m/1000.0, 1) AS distance_km,
         a.map_polyline, a.start_lat, a.start_lng
  FROM public.member_activities a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.excluded_as_duplicate = false
    AND a.map_polyline IS NOT NULL AND a.map_polyline <> ''
    AND a.start_lat IS NOT NULL AND a.start_lng IS NOT NULL
    AND a.activity_date >= now() - make_interval(days => GREATEST(_days, 1))
  ORDER BY a.activity_date DESC;
$$;
REVOKE ALL ON FUNCTION public.get_club_activity_polylines(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_activity_polylines(integer) TO authenticated;