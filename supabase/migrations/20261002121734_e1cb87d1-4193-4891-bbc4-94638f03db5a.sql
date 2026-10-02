CREATE OR REPLACE FUNCTION public.get_unsupported_activities(_days integer DEFAULT 365)
RETURNS TABLE(id uuid, user_id uuid, member_name text, strava_activity_id text, name text, sport_type text, activity_date timestamptz, distance_m integer, moving_time integer, elevation_gain integer, average_speed numeric, looks_like_bike boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, COALESCE(p.full_name, p.nickname, 'Člen'), a.strava_activity_id, a.name,
         COALESCE(a.sport_type, 'Neznámý'), a.activity_date, a.distance_m, a.moving_time, a.elevation_gain, a.average_speed,
         (COALESCE(a.sport_type,'') ~* '(bike|ride|cycl|velo)' OR COALESCE(a.average_speed,0) * 3.6 >= 15)
  FROM public.member_activities a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE (a.sport_type IS NULL OR a.sport_type NOT IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','EMountainBikeRide','VirtualRide'))
    AND a.activity_date >= now() - make_interval(days => GREATEST(_days, 1))
  ORDER BY a.activity_date DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_unsupported_activities(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_unsupported_activities(integer) TO authenticated;