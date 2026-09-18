CREATE OR REPLACE FUNCTION public.get_duplicate_activity_candidates()
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
    (abs(a.distance_m - b.distance_m) <= 500
     AND abs(a.moving_time - b.moving_time) <= 360
     AND (abs(a.elevation_gain - b.elevation_gain) <= 30
          OR abs(a.elevation_gain - b.elevation_gain) <= 0.1 * greatest(a.elevation_gain, b.elevation_gain))
    ) AS likely_duplicate
  FROM public.club_activities a
  JOIN public.club_activities b
    ON a.athlete_full = b.athlete_full
   AND a.id < b.id
   AND a.activity_date::date = b.activity_date::date
  WHERE a.distance_m >= 1000
    AND b.distance_m >= 1000
  ORDER BY likely_duplicate DESC, a.athlete_full, a.activity_date::date, a.distance_m DESC;
END;
$function$;