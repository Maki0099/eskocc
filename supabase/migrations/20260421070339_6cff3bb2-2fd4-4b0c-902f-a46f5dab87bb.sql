-- Table for external Google Photos albums
CREATE TABLE public.external_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  cover_image_url TEXT,
  year INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view external albums"
ON public.external_albums FOR SELECT
USING (
  has_role(auth.uid(), 'member'::app_role)
  OR has_role(auth.uid(), 'active_member'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage external albums"
ON public.external_albums FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_external_albums_updated_at
BEFORE UPDATE ON public.external_albums
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing 4 albums (cover_image_url left null; admin will upload after migration)
INSERT INTO public.external_albums (title, url, year, sort_order) VALUES
  ('Mallorca 2025', 'https://photos.app.goo.gl/Ma8bocoTRLdCebndA', 2025, 0),
  ('Mallorca 2024', 'https://photos.app.goo.gl/RTPTPpkc1kPtMMgBA', 2024, 1),
  ('Mallorca 2023', 'https://photos.app.goo.gl/EsoeTbv4AudTPitD9', 2023, 2),
  ('Mallorca 2022', 'https://photos.app.goo.gl/24M22WZEVDkG5osC8', 2022, 3);

-- Storage bucket for album covers
INSERT INTO storage.buckets (id, name, public) VALUES ('album-covers', 'album-covers', true);

CREATE POLICY "Album covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'album-covers');

CREATE POLICY "Admins can upload album covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'album-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update album covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'album-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete album covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'album-covers' AND has_role(auth.uid(), 'admin'::app_role));