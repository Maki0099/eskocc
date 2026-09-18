-- 1) Týdenní žebříček klubu (aktuální ISO týden)
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
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
    AND a.activity_date >= date_trunc('week', now())
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY km DESC;
$$;
REVOKE ALL ON FUNCTION public.get_weekly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO authenticated;

-- 2) Odznaky člena
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
    SELECT 'horolezec'::text AS badge_key, 'Horolezec'::text AS label,
           ('Jízda s 2000+ m převýšení (' || MAX(elevation_gain) || ' m)')::text AS detail,
           MAX(activity_date) AS earned_at
    FROM acts WHERE elevation_gain >= 2000
  ),
  brzy_rano AS (
    SELECT 'brzy_rano'::text AS badge_key, 'Brzy ráno'::text AS label,
           'Jízda začínající před 6:00'::text AS detail,
           MAX(activity_date) AS earned_at
    FROM acts WHERE EXTRACT(HOUR FROM activity_date) < 6
  ),
  pravidelnost AS (
    SELECT 'pravidelnost'::text AS badge_key, 'Pravidelnost'::text AS label,
           ('Jízda každý týden v měsíci (' || TO_CHAR(month_start, 'FMMonth YYYY') || ')')::text AS detail,
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
  )
  SELECT * FROM stovka WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM horolezec WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM brzy_rano WHERE earned_at IS NOT NULL
  UNION ALL SELECT * FROM pravidelnost WHERE earned_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_member_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_badges(uuid) TO authenticated;

-- 3) Osobní rekordy (přes všechna data)
CREATE OR REPLACE FUNCTION public.get_member_records(_user_id uuid)
RETURNS TABLE(longest_km numeric, longest_date date, fastest_kmh numeric, fastest_date date, most_elevation integer, most_elevation_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT ROUND(distance_m/1000.0, 1) FROM public.member_activities
      WHERE user_id = _user_id AND excluded_as_duplicate = false ORDER BY distance_m DESC LIMIT 1),
    (SELECT activity_date::date FROM public.member_activities
      WHERE user_id = _user_id AND excluded_as_duplicate = false ORDER BY distance_m DESC LIMIT 1),
    (SELECT ROUND((average_speed * 3.6)::numeric, 1) FROM public.member_activities
      WHERE user_id = _user_id AND excluded_as_duplicate = false AND average_speed IS NOT NULL AND distance_m >= 20000
      ORDER BY average_speed DESC LIMIT 1),
    (SELECT activity_date::date FROM public.member_activities
      WHERE user_id = _user_id AND excluded_as_duplicate = false AND average_speed IS NOT NULL AND distance_m >= 20000
      ORDER BY average_speed DESC LIMIT 1),
    (SELECT elevation_gain FROM public.member_activities
      WHERE user_id = _user_id AND excluded_as_duplicate = false ORDER BY elevation_gain DESC LIMIT 1),
    (SELECT activity_date::date FROM public.member_activities
      WHERE user_id = _user_id AND excluded_as_duplicate = false ORDER BY elevation_gain DESC LIMIT 1);
$$;
REVOKE ALL ON FUNCTION public.get_member_records(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_records(uuid) TO authenticated;

-- 4) Startovní body jízd klubu za posledních N dní
CREATE OR REPLACE FUNCTION public.get_club_activity_starts(_days integer DEFAULT 90)
RETURNS TABLE(user_id uuid, full_name text, start_lat numeric, start_lng numeric, activity_date timestamptz, distance_m integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.user_id, p.full_name, a.start_lat, a.start_lng, a.activity_date, a.distance_m
  FROM public.member_activities a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.excluded_as_duplicate = false
    AND a.start_lat IS NOT NULL AND a.start_lng IS NOT NULL
    AND a.activity_date >= now() - make_interval(days => GREATEST(_days, 1))
  ORDER BY a.activity_date DESC;
$$;
REVOKE ALL ON FUNCTION public.get_club_activity_starts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_activity_starts(integer) TO authenticated;

-- 5) Společné jízdy člena
CREATE OR REPLACE FUNCTION public.get_shared_rides(_user_id uuid)
RETURNS TABLE(activity_date date, own_distance_km numeric, partner_id uuid, partner_name text, partner_avatar text, partner_distance_km numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.activity_date::date,
         ROUND(a.distance_m/1000.0, 1) AS own_distance_km,
         b.user_id AS partner_id,
         p.full_name AS partner_name,
         p.avatar_url AS partner_avatar,
         ROUND(b.distance_m/1000.0, 1) AS partner_distance_km
  FROM public.member_activities a
  JOIN public.member_activities b
    ON b.user_id <> a.user_id
   AND b.activity_date::date = a.activity_date::date
   AND b.excluded_as_duplicate = false
   AND ABS(b.distance_m - a.distance_m) <= GREATEST(3000, a.distance_m * 0.15)
   AND (a.start_lat IS NULL OR b.start_lat IS NULL
        OR (ABS(a.start_lat - b.start_lat) < 0.03 AND ABS(a.start_lng - b.start_lng) < 0.04))
  JOIN public.profiles p ON p.id = b.user_id
  WHERE a.user_id = _user_id AND a.excluded_as_duplicate = false
  ORDER BY a.activity_date DESC
  LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.get_shared_rides(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_rides(uuid) TO authenticated;

-- 6) Týdenní zátěž člena
CREATE OR REPLACE FUNCTION public.get_member_weekly_load(_user_id uuid, _weeks integer DEFAULT 12)
RETURNS TABLE(week_start date, km numeric, elevation numeric, suffer integer, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT date_trunc('week', activity_date)::date AS week_start,
         ROUND(SUM(distance_m)/1000.0, 1) AS km,
         SUM(elevation_gain) AS elevation,
         COALESCE(SUM(suffer_score), 0)::integer AS suffer,
         COUNT(*)::integer AS rides
  FROM public.member_activities
  WHERE user_id = _user_id AND excluded_as_duplicate = false
    AND activity_date >= date_trunc('week', now()) - make_interval(weeks => GREATEST(_weeks, 1) - 1)
  GROUP BY 1
  ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.get_member_weekly_load(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_weekly_load(uuid, integer) TO authenticated;

-- 7) Vývoj tepové frekvence po měsících
CREATE OR REPLACE FUNCTION public.get_member_heartrate_trend(_user_id uuid, _year integer)
RETURNS TABLE(month integer, avg_hr numeric, max_hr numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXTRACT(MONTH FROM activity_date)::integer AS month,
         ROUND(AVG(average_heartrate), 0) AS avg_hr,
         MAX(max_heartrate)::numeric AS max_hr,
         COUNT(*)::integer AS rides
  FROM public.member_activities
  WHERE user_id = _user_id AND excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM activity_date) = _year
    AND average_heartrate IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.get_member_heartrate_trend(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_heartrate_trend(uuid, integer) TO authenticated;

-- 8) Statistiky členů s filtrem trenažér/dojíždění (z osobních jízd za aktuální rok)
CREATE OR REPLACE FUNCTION public.get_member_statistics_filtered(_include_trainer boolean DEFAULT true, _include_commute boolean DEFAULT true)
RETURNS TABLE(user_id uuid, km numeric, elevation numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.user_id,
         ROUND(SUM(a.distance_m)/1000.0, 1) AS km,
         SUM(a.elevation_gain) AS elevation,
         COUNT(*)::integer AS rides
  FROM public.member_activities a
  WHERE a.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM a.activity_date) = EXTRACT(YEAR FROM now())
    AND (_include_trainer OR a.is_trainer = false)
    AND (_include_commute OR a.is_commute = false)
  GROUP BY a.user_id;
$$;
REVOKE ALL ON FUNCTION public.get_member_statistics_filtered(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_statistics_filtered(boolean, boolean) TO authenticated;