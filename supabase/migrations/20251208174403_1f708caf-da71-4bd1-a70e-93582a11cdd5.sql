-- Extend get_club_teaser_stats to include anonymized top riders
CREATE OR REPLACE FUNCTION public.get_club_teaser_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    ),
    'top_riders', (
      SELECT COALESCE(json_agg(rider_data), '[]'::json)
      FROM (
        SELECT 
          LEFT(COALESCE(p2.nickname, p2.full_name, 'Člen'), 1) || '.' as initials,
          COALESCE(p2.strava_ytd_distance, 0) as distance
        FROM user_roles ur2
        LEFT JOIN profiles p2 ON p2.id = ur2.user_id
        WHERE ur2.role IN ('member', 'active_member', 'admin')
          AND COALESCE(p2.strava_ytd_distance, 0) > 0
        ORDER BY p2.strava_ytd_distance DESC NULLS LAST
        LIMIT 3
      ) as rider_data
    )
  )
  INTO result
  FROM user_roles ur
  LEFT JOIN profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('member', 'active_member', 'admin');
  
  RETURN result;
END;
$$;

-- Create new function to get top members with full data (for authenticated members only)
CREATE OR REPLACE FUNCTION public.get_top_members(limit_count INT DEFAULT 3)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Only allow authenticated members to access this data
  IF NOT (
    has_role(auth.uid(), 'member') OR 
    has_role(auth.uid(), 'active_member') OR 
    has_role(auth.uid(), 'admin')
  ) THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(json_agg(member_data), '[]'::json)
  INTO result
  FROM (
    SELECT 
      p.id,
      p.full_name,
      p.nickname,
      p.avatar_url,
      COALESCE(p.strava_ytd_distance, 0) as ytd_distance
    FROM user_roles ur
    LEFT JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role IN ('member', 'active_member', 'admin')
      AND COALESCE(p.strava_ytd_distance, 0) > 0
    ORDER BY p.strava_ytd_distance DESC NULLS LAST
    LIMIT limit_count
  ) as member_data;
  
  RETURN result;
END;
$$;