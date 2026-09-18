DROP FUNCTION IF EXISTS public.get_member_trainer_ratio(uuid, integer);

CREATE FUNCTION public.get_member_trainer_ratio(_user_id uuid, _year integer DEFAULT EXTRACT(YEAR FROM now())::integer)
RETURNS TABLE(category text, km numeric, rides integer, minutes numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN a.is_trainer OR a.sport_type IN ('VirtualRide','VirtualRun') THEN 'Trenažér' ELSE 'Venku' END AS category,
    ROUND(SUM(a.distance_m)/1000.0, 1) AS km,
    COUNT(*)::integer AS rides,
    ROUND(SUM(a.moving_time)/60.0, 0) AS minutes
  FROM public.member_activities a
  WHERE a.user_id = _user_id
    AND a.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM a.activity_date) = _year
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','VirtualRide')
  GROUP BY 1
$$;

REVOKE ALL ON FUNCTION public.get_member_trainer_ratio(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_member_trainer_ratio(uuid, integer) TO authenticated;