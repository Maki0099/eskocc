-- Step 1: Add RLS policy for members to view other member profiles
CREATE POLICY "Members can view other member profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'member'::app_role) OR 
  has_role(auth.uid(), 'active_member'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Step 2: Recreate view with security_invoker = true
DROP VIEW IF EXISTS public.member_profiles_public;

CREATE VIEW public.member_profiles_public
WITH (security_invoker = true)
AS
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
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = ANY (ARRAY['member'::app_role, 'active_member'::app_role, 'admin'::app_role]);

-- Grant access to authenticated users only (not anon - they shouldn't see member data)
GRANT SELECT ON public.member_profiles_public TO authenticated;