DROP FUNCTION IF EXISTS public.get_member_statistics() CASCADE;

CREATE OR REPLACE FUNCTION public.get_member_statistics()
 RETURNS TABLE(
   id uuid,
   full_name text,
   nickname text,
   avatar_url text,
   strava_ytd_distance integer,
   strava_ytd_count integer,
   strava_ytd_elevation integer,
   age_category text,
   created_at timestamp with time zone,
   is_connected boolean,
   needs_reauth boolean,
   last_synced_at timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'member') OR
    has_role(auth.uid(), 'active_member') OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.nickname,
    p.avatar_url,
    COALESCE(p.strava_ytd_distance, 0) AS strava_ytd_distance,
    COALESCE(p.strava_ytd_count, 0) AS strava_ytd_count,
    COALESCE(p.strava_ytd_elevation, 0) AS strava_ytd_elevation,
    CASE
      WHEN p.birth_date IS NULL THEN 'under_40'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 60 THEN 'over_60'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 40 THEN 'under_60'
      ELSE 'under_40'
    END AS age_category,
    p.created_at,
    COALESCE(t.athlete_id IS NOT NULL AND t.needs_reauth = false, false) AS is_connected,
    COALESCE(t.athlete_id IS NOT NULL AND t.needs_reauth = true, false) AS needs_reauth,
    t.last_synced_at
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.user_strava_tokens t ON t.user_id = p.id
  WHERE ur.role IN ('member', 'active_member', 'admin');
END;
$function$;

REVOKE ALL ON FUNCTION public.get_member_statistics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_statistics() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_member_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_statistics() TO service_role;