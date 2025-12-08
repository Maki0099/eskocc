-- Create a secure view for public member data (excludes sensitive fields)
CREATE OR REPLACE VIEW public.member_profiles_public AS
SELECT 
  p.id,
  p.full_name,
  p.nickname,
  p.avatar_url,
  p.strava_ytd_distance,
  p.strava_ytd_count,
  p.strava_id,
  p.created_at
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role IN ('member', 'active_member', 'admin');

-- Grant access to authenticated users
GRANT SELECT ON public.member_profiles_public TO authenticated;

-- Drop the overly permissive policy for members viewing other profiles
DROP POLICY IF EXISTS "Members can view other profiles" ON public.profiles;