-- 1. Restrict gallery_items SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view gallery items" ON public.gallery_items;

CREATE POLICY "Authenticated users can view gallery items"
ON public.gallery_items
FOR SELECT
TO authenticated
USING (true);

-- 2. Remove admin SELECT access on user_strava_tokens
-- Admin Strava operations must use a service-role edge function instead
DROP POLICY IF EXISTS "Admins read all strava tokens" ON public.user_strava_tokens;