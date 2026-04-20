CREATE OR REPLACE FUNCTION public.get_public_club_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'members', (SELECT COUNT(*) FROM user_roles WHERE role IN ('member','active_member','admin')),
    'routes', (SELECT COUNT(*) FROM favorite_routes),
    'events_total', (SELECT COUNT(*) FROM events),
    'gallery_items', (SELECT COUNT(*) FROM gallery_items),
    'ytd_km', COALESCE((SELECT SUM(strava_ytd_distance) FROM profiles), 0),
    'ytd_rides', COALESCE((SELECT SUM(strava_ytd_count) FROM profiles), 0)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_club_stats() TO anon, authenticated;