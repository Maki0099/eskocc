-- Drop and recreate get_member_statistics to include is_strava_club_member
DROP FUNCTION IF EXISTS public.get_member_statistics();

CREATE FUNCTION public.get_member_statistics()
 RETURNS TABLE(id uuid, full_name text, nickname text, avatar_url text, strava_id text, strava_ytd_distance integer, strava_ytd_count integer, age_category text, created_at timestamp with time zone, is_strava_club_member boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow authenticated members to access this data
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
    p.strava_id,
    COALESCE(p.strava_ytd_distance, 0) as strava_ytd_distance,
    COALESCE(p.strava_ytd_count, 0) as strava_ytd_count,
    CASE 
      WHEN p.birth_date IS NULL THEN 'under_40'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 60 THEN 'over_60'
      WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 40 THEN 'under_60'
      ELSE 'under_40'
    END as age_category,
    p.created_at,
    COALESCE(p.is_strava_club_member, false) as is_strava_club_member
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('member', 'active_member', 'admin');
END;
$function$;