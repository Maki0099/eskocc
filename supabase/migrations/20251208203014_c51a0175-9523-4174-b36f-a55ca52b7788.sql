-- Drop and recreate view with SECURITY INVOKER
DROP VIEW IF EXISTS public.member_profiles_public;

CREATE VIEW public.member_profiles_public 
WITH (security_invoker = true) AS
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