DROP FUNCTION IF EXISTS public.get_club_activity_polylines(integer);

CREATE FUNCTION public.get_club_activity_polylines(_days integer DEFAULT 90)
RETURNS TABLE(user_id uuid, full_name text, activity_date date, distance_km numeric, map_polyline text, start_lat numeric, start_lng numeric, is_virtual boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.user_id, p.full_name, a.activity_date::date,
         ROUND(a.distance_m/1000.0, 1) AS distance_km,
         a.map_polyline, a.start_lat, a.start_lng,
         (a.is_trainer = true OR a.sport_type IN ('VirtualRide','VirtualRun')) AS is_virtual
  FROM public.member_activities a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.excluded_as_duplicate = false
    AND a.map_polyline IS NOT NULL AND a.map_polyline <> ''
    AND a.start_lat IS NOT NULL AND a.start_lng IS NOT NULL
    AND a.activity_date >= now() - make_interval(days => GREATEST(_days, 1))
  ORDER BY a.activity_date DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_club_activity_polylines(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_activity_polylines(integer) TO authenticated;