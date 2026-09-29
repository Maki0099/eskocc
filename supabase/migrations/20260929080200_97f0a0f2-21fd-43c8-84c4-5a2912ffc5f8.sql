CREATE OR REPLACE FUNCTION public.get_member_routes(_user_id uuid, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, activity_date timestamp with time zone, distance_m integer, moving_time integer, elevation_gain integer, sport_type text, map_polyline text, start_lat numeric, start_lng numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, a.activity_date, a.distance_m, a.moving_time,
         a.elevation_gain, a.sport_type, a.map_polyline, a.start_lat, a.start_lng
  FROM public.member_activities a
  WHERE a.user_id = _user_id
    AND a.excluded_as_duplicate = false
    AND a.map_polyline IS NOT NULL AND a.map_polyline <> ''
    AND a.is_trainer = false
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','EMountainBikeRide')
  ORDER BY a.activity_date DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1)
  OFFSET GREATEST(_offset, 0);
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_activities(_token text, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, activity_date timestamp with time zone, distance_m integer, moving_time integer, elevation_gain integer, sport_type text, map_polyline text, start_lat numeric, start_lng numeric, average_speed numeric, average_heartrate numeric, average_watts numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH link AS (
    SELECT * FROM public.share_links s
    WHERE s.token = _token AND s.revoked_at IS NULL
    LIMIT 1
  )
  SELECT a.id, a.name, a.activity_date, a.distance_m, a.moving_time,
         a.elevation_gain, a.sport_type, a.map_polyline, a.start_lat, a.start_lng,
         a.average_speed,
         CASE WHEN l.include_biometrics THEN a.average_heartrate END,
         CASE WHEN l.include_biometrics THEN a.average_watts END
  FROM link l
  JOIN public.member_activities a ON a.user_id = l.owner_id
  WHERE a.excluded_as_duplicate = false
    AND a.map_polyline IS NOT NULL AND a.map_polyline <> ''
    AND a.is_trainer = false
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','EMountainBikeRide')
    AND (l.kind = 'profile' OR a.id = l.activity_id)
  ORDER BY a.activity_date DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1)
  OFFSET GREATEST(_offset, 0);
$function$;

CREATE OR REPLACE FUNCTION public.get_member_statistics_filtered(_mode text DEFAULT 'all'::text)
 RETURNS TABLE(user_id uuid, km numeric, elevation numeric, rides integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.user_id,
         ROUND(SUM(a.distance_m)/1000.0, 1) AS km,
         SUM(a.elevation_gain) AS elevation,
         COUNT(*)::integer AS rides
  FROM public.member_activities a
  WHERE a.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM a.activity_date) = EXTRACT(YEAR FROM now())
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','EMountainBikeRide','VirtualRide')
    AND (
      _mode = 'all'
      OR (_mode = 'trainer' AND (a.is_trainer = true OR a.sport_type IN ('VirtualRide','VirtualRun')))
      OR (_mode = 'outdoor' AND a.is_trainer = false AND a.sport_type NOT IN ('VirtualRide','VirtualRun'))
    )
  GROUP BY a.user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_member_trainer_ratio(_user_id uuid, _year integer DEFAULT (EXTRACT(year FROM now()))::integer)
 RETURNS TABLE(category text, km numeric, rides integer, minutes numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN a.is_trainer OR a.sport_type IN ('VirtualRide','VirtualRun') THEN 'Trenažér' ELSE 'Venku' END AS category,
    ROUND(SUM(a.distance_m)/1000.0, 1) AS km,
    COUNT(*)::integer AS rides,
    ROUND(SUM(a.moving_time)/60.0, 0) AS minutes
  FROM public.member_activities a
  WHERE a.user_id = _user_id
    AND a.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM a.activity_date) = _year
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','EMountainBikeRide','VirtualRide')
  GROUP BY 1
$function$;