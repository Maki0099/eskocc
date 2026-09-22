CREATE OR REPLACE FUNCTION public.get_member_routes(_user_id uuid, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  name text,
  activity_date timestamp with time zone,
  distance_m integer,
  moving_time integer,
  elevation_gain integer,
  sport_type text,
  map_polyline text,
  start_lat numeric,
  start_lng numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.name, a.activity_date, a.distance_m, a.moving_time,
         a.elevation_gain, a.sport_type, a.map_polyline, a.start_lat, a.start_lng
  FROM public.member_activities a
  WHERE a.user_id = _user_id
    AND a.excluded_as_duplicate = false
    AND a.map_polyline IS NOT NULL AND a.map_polyline <> ''
    AND a.is_trainer = false
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide')
  ORDER BY a.activity_date DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1)
  OFFSET GREATEST(_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.get_member_routes(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_routes(uuid, integer, integer) TO authenticated, service_role;