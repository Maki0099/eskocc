-- Create a SECURITY DEFINER function to get club teaser stats for anonymous users
CREATE OR REPLACE FUNCTION public.get_club_teaser_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  current_year INT := EXTRACT(YEAR FROM NOW())::INT;
BEGIN
  SELECT json_build_object(
    'total_distance', COALESCE(SUM(p.strava_ytd_distance), 0),
    'member_count', COUNT(DISTINCT ur.user_id),
    'target_distance', COALESCE(
      (SELECT club_total_target FROM yearly_challenge_settings WHERE year = current_year LIMIT 1),
      70000
    )
  )
  INTO result
  FROM user_roles ur
  LEFT JOIN profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('member', 'active_member', 'admin');
  
  RETURN result;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_club_teaser_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_club_teaser_stats() TO authenticated;