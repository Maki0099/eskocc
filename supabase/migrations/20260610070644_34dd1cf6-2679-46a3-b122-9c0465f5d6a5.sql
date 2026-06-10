
-- 1. event_participants: restrict SELECT to authenticated members/admins
DROP POLICY IF EXISTS "Anyone can view participants" ON public.event_participants;
CREATE POLICY "Members can view participants"
ON public.event_participants
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'member'::app_role)
  OR has_role(auth.uid(), 'active_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. routes storage: replace overly permissive "Service role can manage routes files"
DROP POLICY IF EXISTS "Service role can manage routes files" ON storage.objects;

CREATE POLICY "Members can upload routes files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'routes'
  AND (
    has_role(auth.uid(), 'member'::app_role)
    OR has_role(auth.uid(), 'active_member'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins can update routes files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'routes' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'routes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete routes files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'routes' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. vapid_keys: explicit admin-only SELECT policy (clarity + audit)
CREATE POLICY "Only admins can read vapid keys"
ON public.vapid_keys
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. gallery storage: add owner-scoped UPDATE policy mirroring DELETE
CREATE POLICY "Users can update own gallery photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'gallery'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
