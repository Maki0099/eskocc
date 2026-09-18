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
           ('Jízda každý týden v měsíci (' ||
             (ARRAY['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'])[EXTRACT(MONTH FROM month_start)::int]
             || ' ' || EXTRACT(YEAR FROM month_start)::int || ')')::text AS detail,
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