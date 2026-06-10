
-- Beskydy routes content table (admin-editable)
CREATE TABLE public.beskydy_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  start_location text NOT NULL DEFAULT '',
  distance_km integer NOT NULL DEFAULT 0,
  elevation_m integer NOT NULL DEFAULT 0,
  terrain text NOT NULL DEFAULT 'road',
  difficulty text NOT NULL DEFAULT 'medium',
  description text NOT NULL DEFAULT '',
  gpx_path text NOT NULL,
  mapy_url text,
  komoot_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.beskydy_routes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beskydy_routes TO authenticated;
GRANT ALL ON public.beskydy_routes TO service_role;

ALTER TABLE public.beskydy_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published beskydy routes"
  ON public.beskydy_routes FOR SELECT
  USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage beskydy routes"
  ON public.beskydy_routes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_beskydy_routes_updated_at
  BEFORE UPDATE ON public.beskydy_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_beskydy_routes_sort ON public.beskydy_routes (sort_order, created_at);

-- Storage policies for beskydy GPX files in existing public 'routes' bucket (prefix beskydy/)
CREATE POLICY "Public read beskydy gpx"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'routes' AND (storage.foldername(name))[1] = 'beskydy');

CREATE POLICY "Admins upload beskydy gpx"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'routes'
    AND (storage.foldername(name))[1] = 'beskydy'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update beskydy gpx"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'routes'
    AND (storage.foldername(name))[1] = 'beskydy'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete beskydy gpx"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'routes'
    AND (storage.foldername(name))[1] = 'beskydy'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Seed 6 current curated routes (gpx_path pointing to legacy /public path as fallback)
INSERT INTO public.beskydy_routes (slug, title, start_location, distance_km, elevation_m, terrain, difficulty, description, gpx_path, mapy_url, komoot_url, sort_order) VALUES
('karolinka-solan-velke-karlovice','Karolinka – Soláň – Velké Karlovice','Karolinka (klubovna ESKO.cc)',45,900,'road','medium','Klasický okruh z naší klubovny: výjezd na Soláň (861 m) po hlavní silnici, sjezd do Velkých Karlovic a návrat údolím Vsetínské Bečvy. Skvělý úvod do beskydské cyklistiky.','/gpx/beskydy/karolinka-solan-velke-karlovice.gpx','https://mapy.cz/turisticka?planovani-trasy&rc=9hAK9xY6mF','https://www.komoot.com/discover/Sol%C3%A1%C5%88/@49.4267,18.2333',10),
('pustevny-od-trojanovic','Pustevny od Trojanovic','Trojanovice',15,700,'road','hard','Legendární výjezd ke chatě Pustevny (1 018 m). Kvalitní asfalt, průměrné stoupání 8 %, v horní třetině úseky přes 12 %. Nahoře odměnou Jurkovičovy stavby a výhled na Radhošť.','/gpx/beskydy/pustevny-od-trojanovic.gpx',NULL,'https://www.komoot.com/discover/Pustevny/@49.4900,18.2900',20),
('lysa-hora-z-krasne','Lysá hora z Krásné','Krásná pod Lysou horou',11,1100,'road','hard','Nejvyšší silniční stoupání v Beskydech (1 323 m). 11 km nepřetržitého stoupání s průměrem 9 %, místy přes 14 %. Asfaltová zákazová cesta jen pro pěší a kola.','/gpx/beskydy/lysa-hora-z-krasne.gpx',NULL,'https://www.komoot.com/discover/Lys%C3%A1+hora/@49.5450,18.4480',30),
('bumbalka-okruh','Okruh přes Bumbálku','Velké Karlovice',38,750,'road','medium','Příjemný táhlý výjezd k hraničnímu sedlu Bumbálka (870 m) směrem na Slovensko. Návrat přes Bílou nebo zpět údolím. Tichá silnice, krásné výhledy do Javorníků.','/gpx/beskydy/bumbalka-okruh.gpx',NULL,NULL,40),
('becva-cyklostezka','Bečva cyklostezka','Karolinka → Vsetín → Valašské Meziříčí',40,150,'road','easy','Rovinatá asfaltová cyklostezka podél Vsetínské a Rožnovské Bečvy. Ideální pro rodiny, začátečníky nebo regenerační vyjížďky. Propojuje hlavní obce regionu.','/gpx/beskydy/becva-cyklostezka.gpx',NULL,NULL,50),
('gravel-javorniky','Gravel přes hřebeny Javorníků','Velké Karlovice – Soláň',55,1300,'gravel','hard','Náročný gravelový okruh kombinující lesní cesty Javorníků a asfaltové sjezdy. Většina stoupání po štěrku, terén místy vyžaduje sjezdové zkušenosti. Doporučené pneu od 40 mm.','/gpx/beskydy/gravel-javorniky.gpx',NULL,NULL,60);
