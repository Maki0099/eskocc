DROP POLICY IF EXISTS "Authenticated users can upload gallery photos" ON storage.objects;

CREATE POLICY "Members can upload gallery photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND (
    public.has_role(auth.uid(), 'member'::app_role)
    OR public.has_role(auth.uid(), 'active_member'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);