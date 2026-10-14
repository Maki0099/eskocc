CREATE TABLE public.camp_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp text NOT NULL DEFAULT 'mallorca-2026',
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  distance_km integer NOT NULL DEFAULT 0,
  elevation_m integer NOT NULL DEFAULT 0,
  difficulty text NOT NULL DEFAULT 'medium',
  terrain text NOT NULL DEFAULT 'road',
  camp_day integer,
  gpx_path text NOT NULL,
  mapy_url text,
  cover_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_routes TO authenticated;
GRANT ALL ON public.camp_routes TO service_role;
ALTER TABLE public.camp_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read camp routes" ON public.camp_routes FOR SELECT TO authenticated
USING ((is_published AND (has_role(auth.uid(),'member') OR has_role(auth.uid(),'active_member'))) OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage camp routes" ON public.camp_routes FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER camp_routes_updated BEFORE UPDATE ON public.camp_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.camp_route_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.camp_routes(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  is_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_route_photos TO authenticated;
GRANT ALL ON public.camp_route_photos TO service_role;
ALTER TABLE public.camp_route_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read camp photos" ON public.camp_route_photos FOR SELECT TO authenticated
USING (has_role(auth.uid(),'member') OR has_role(auth.uid(),'active_member') OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage camp photos" ON public.camp_route_photos FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Admins upload camp files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'routes' AND (storage.foldername(name))[1] = 'camp' AND has_role(auth.uid(),'admin'));