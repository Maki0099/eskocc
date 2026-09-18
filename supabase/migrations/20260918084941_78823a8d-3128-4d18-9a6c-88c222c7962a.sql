DROP FUNCTION IF EXISTS public.get_duplicate_activity_candidates();
CREATE FUNCTION public.get_duplicate_activity_candidates()
 RETURNS TABLE(a_id uuid, b_id uuid, athlete_full text, matched_user_id uuid, a_distance_m integer, b_distance_m integer, a_moving_time integer, b_moving_time integer, a_elevation integer, b_elevation integer, a_sport_type text, b_sport_type text, a_date timestamp with time zone, b_date timestamp with time zone, a_excluded boolean, b_excluded boolean, likely_duplicate boolean)
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
    a.excluded_as_duplicate, b.excluded_as_duplicate,
    (abs(a.distance_m - b.distance_m) <= 50 AND abs(a.moving_time - b.moving_time) <= 60) AS likely_duplicate
  FROM public.club_activities a
  JOIN public.club_activities b
    ON a.athlete_full = b.athlete_full
   AND a.id < b.id
   AND COALESCE(a.sport_type,'') = COALESCE(b.sport_type,'')
   AND (abs(a.distance_m - b.distance_m) <= 300
        OR abs(a.distance_m - b.distance_m) <= 0.02 * GREATEST(a.distance_m, b.distance_m))
   AND (abs(a.moving_time - b.moving_time) <= 300
        OR abs(a.moving_time - b.moving_time) <= 0.05 * GREATEST(a.moving_time, b.moving_time))
  WHERE a.distance_m >= 1000
    AND b.distance_m >= 1000
    AND a.moving_time >= 60
    AND b.moving_time >= 60
  ORDER BY likely_duplicate DESC, a.athlete_full, a.distance_m DESC;
END;
$function$