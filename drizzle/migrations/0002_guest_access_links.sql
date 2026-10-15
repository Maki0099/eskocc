CREATE TABLE public.guest_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_by uuid,
  guest_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_access_links TO authenticated;
GRANT ALL ON public.guest_access_links TO service_role;
ALTER TABLE public.guest_access_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage guest links" ON public.guest_access_links FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_active_guest(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_role(_user_id,'guest') AND EXISTS (
    SELECT 1 FROM public.guest_access_links g
    WHERE g.guest_user_id = _user_id AND g.revoked_at IS NULL AND g.expires_at > now())
$$;

CREATE OR REPLACE FUNCTION public.can_view_club(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_role(_user_id,'member') OR has_role(_user_id,'active_member') OR has_role(_user_id,'admin') OR is_active_guest(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_guest_access_status()
RETURNS TABLE(is_guest boolean, active boolean, expires_at timestamptz, label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT has_role(auth.uid(),'guest'),
         COALESCE(g.revoked_at IS NULL AND g.expires_at > now(), false),
         g.expires_at, g.label
  FROM (SELECT 1) x
  LEFT JOIN LATERAL (SELECT * FROM public.guest_access_links WHERE guest_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1) g ON true
$$;

DROP POLICY "Members read camp photos" ON public.camp_route_photos;
CREATE POLICY "Members read camp photos" ON public.camp_route_photos FOR SELECT USING (can_view_club(auth.uid()));
DROP POLICY "Members read camp routes" ON public.camp_routes;
CREATE POLICY "Members read camp routes" ON public.camp_routes FOR SELECT USING ((is_published AND can_view_club(auth.uid())) OR has_role(auth.uid(),'admin'));
DROP POLICY "Members can view club activities" ON public.club_activities;
CREATE POLICY "Members can view club activities" ON public.club_activities FOR SELECT USING (can_view_club(auth.uid()));
DROP POLICY "Members can view athlete mappings" ON public.club_athlete_mappings;
CREATE POLICY "Members can view athlete mappings" ON public.club_athlete_mappings FOR SELECT USING (can_view_club(auth.uid()));
DROP POLICY "Members can view participants" ON public.event_participants;
CREATE POLICY "Members can view participants" ON public.event_participants FOR SELECT USING (can_view_club(auth.uid()));
DROP POLICY "Members can view external albums" ON public.external_albums;
CREATE POLICY "Members can view external albums" ON public.external_albums FOR SELECT USING (can_view_club(auth.uid()));
DROP POLICY "Members can view all routes" ON public.favorite_routes;
CREATE POLICY "Members can view all routes" ON public.favorite_routes FOR SELECT USING (can_view_club(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_member_statistics()
 RETURNS TABLE(id uuid, full_name text, nickname text, avatar_url text, strava_ytd_distance integer, strava_ytd_count integer, strava_ytd_elevation integer, age_category text, created_at timestamp with time zone, is_connected boolean, needs_reauth boolean, last_synced_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT can_view_club(auth.uid()) THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.nickname, p.avatar_url,
    COALESCE(p.strava_ytd_distance, 0), COALESCE(p.strava_ytd_count, 0), COALESCE(p.strava_ytd_elevation, 0),
    CASE
      WHEN p.birth_date IS NULL THEN 'under_40'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 60 THEN 'over_60'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 40 THEN 'under_60'
      ELSE 'under_40'
    END,
    p.created_at,
    COALESCE(t.athlete_id IS NOT NULL AND t.needs_reauth = false, false),
    COALESCE(t.athlete_id IS NOT NULL AND t.needs_reauth = true, false),
    t.last_synced_at
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.user_strava_tokens t ON t.user_id = p.id
  WHERE ur.role IN ('member', 'active_member', 'admin');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_members(limit_count integer DEFAULT 3)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result JSON;
BEGIN
  IF NOT can_view_club(auth.uid()) THEN RETURN '[]'::json; END IF;
  SELECT COALESCE(json_agg(member_data), '[]'::json) INTO result
  FROM (
    SELECT p.id, p.full_name, p.nickname, p.avatar_url, COALESCE(p.strava_ytd_distance, 0) as ytd_distance
    FROM user_roles ur LEFT JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role IN ('member', 'active_member', 'admin') AND COALESCE(p.strava_ytd_distance, 0) > 0
    ORDER BY p.strava_ytd_distance DESC NULLS LAST
    LIMIT limit_count
  ) as member_data;
  RETURN result;
END;
$function$;