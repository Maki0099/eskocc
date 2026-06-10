
-- 1) Remove event_subscriptions from realtime to prevent broadcasting other users' subscription rows
ALTER PUBLICATION supabase_realtime DROP TABLE public.event_subscriptions;

-- 2) Scope routes bucket uploads to a per-user folder
DROP POLICY IF EXISTS "Members can upload routes files" ON storage.objects;

CREATE POLICY "Members can upload routes files to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'routes'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    has_role(auth.uid(), 'member'::app_role)
    OR has_role(auth.uid(), 'active_member'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow users to update/delete files within their own folder (admins keep their broad policy)
CREATE POLICY "Users can update own routes files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'routes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own routes files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'routes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
