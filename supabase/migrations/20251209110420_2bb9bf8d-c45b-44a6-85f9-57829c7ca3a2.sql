-- Drop and recreate the view to include is_strava_club_member
DROP VIEW IF EXISTS public.member_profiles_public;

CREATE VIEW public.member_profiles_public AS
SELECT 
  p.id,
  p.full_name,
  p.nickname,
  p.avatar_url,
  p.strava_ytd_distance,
  p.strava_ytd_count,
  p.strava_id,
  p.created_at,
  p.is_strava_club_member
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role IN ('member', 'active_member', 'admin');