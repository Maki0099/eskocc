CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('profile','activity')),
  activity_id uuid REFERENCES public.member_activities(id) ON DELETE CASCADE,
  include_biometrics boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their share links"
ON public.share_links FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER trg_share_links_updated
BEFORE UPDATE ON public.share_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_share_links_owner ON public.share_links(owner_id);

-- Validate kind/activity consistency
CREATE OR REPLACE FUNCTION public.validate_share_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.kind = 'activity' THEN
    IF NEW.activity_id IS NULL THEN
      RAISE EXCEPTION 'activity_id is required for activity share links';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.member_activities ma
      WHERE ma.id = NEW.activity_id AND ma.user_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'activity does not belong to owner';
    END IF;
  ELSE
    NEW.activity_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_share_links_validate
BEFORE INSERT OR UPDATE ON public.share_links
FOR EACH ROW EXECUTE FUNCTION public.validate_share_link();

-- Public reads via token
CREATE OR REPLACE FUNCTION public.get_shared_payload(_token text)
RETURNS TABLE(
  kind text,
  include_biometrics boolean,
  owner_id uuid,
  full_name text,
  nickname text,
  avatar_url text,
  ytd_distance integer,
  ytd_elevation integer,
  ytd_count integer,
  activity_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.kind, s.include_biometrics, s.owner_id,
         p.full_name, p.nickname, p.avatar_url,
         COALESCE(p.strava_ytd_distance, 0),
         COALESCE(p.strava_ytd_elevation, 0),
         COALESCE(p.strava_ytd_count, 0),
         s.activity_id
  FROM public.share_links s
  JOIN public.profiles p ON p.id = s.owner_id
  WHERE s.token = _token
    AND s.revoked_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_activities(_token text, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  name text,
  activity_date timestamptz,
  distance_m integer,
  moving_time integer,
  elevation_gain integer,
  sport_type text,
  map_polyline text,
  start_lat numeric,
  start_lng numeric,
  average_speed numeric,
  average_heartrate numeric,
  average_watts numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH link AS (
    SELECT * FROM public.share_links s
    WHERE s.token = _token AND s.revoked_at IS NULL
    LIMIT 1
  )
  SELECT a.id, a.name, a.activity_date, a.distance_m, a.moving_time,
         a.elevation_gain, a.sport_type, a.map_polyline, a.start_lat, a.start_lng,
         a.average_speed,
         CASE WHEN l.include_biometrics THEN a.average_heartrate END,
         CASE WHEN l.include_biometrics THEN a.average_watts END
  FROM link l
  JOIN public.member_activities a ON a.user_id = l.owner_id
  WHERE a.excluded_as_duplicate = false
    AND a.map_polyline IS NOT NULL AND a.map_polyline <> ''
    AND a.is_trainer = false
    AND a.sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide')
    AND (l.kind = 'profile' OR a.id = l.activity_id)
  ORDER BY a.activity_date DESC
  LIMIT GREATEST(LEAST(_limit, 100), 1)
  OFFSET GREATEST(_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.register_share_view(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.share_links
  SET view_count = view_count + 1
  WHERE token = _token AND revoked_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_payload(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_activities(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_share_view(text) TO anon, authenticated;