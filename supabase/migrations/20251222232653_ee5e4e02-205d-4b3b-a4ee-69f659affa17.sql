-- Drop the overly permissive RLS policy that exposes sensitive data
-- Members should use member_profiles_public view for viewing other members' profiles
-- This view already excludes email, phone, birth_date, and Strava tokens
DROP POLICY IF EXISTS "Members can view other member profiles" ON public.profiles;