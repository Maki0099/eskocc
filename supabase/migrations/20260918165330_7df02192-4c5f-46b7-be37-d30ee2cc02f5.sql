DROP FUNCTION IF EXISTS public.get_member_statistics_filtered(boolean, boolean);

CREATE OR REPLACE FUNCTION public.get_member_statistics_filtered(_mode text DEFAULT 'all')
RETURNS TABLE(user_id uuid, km numeric, elevation numeric, rides integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.user_id,
         ROUND(SUM(a.distance_m)/1000.0, 1) AS km,
         SUM(a.elevation_gain) AS elevation,
         COUNT(*)::integer AS rides
  FROM public.member_activities a
  WHERE a.excluded_as_duplicate = false
    AND EXTRACT(YEAR FROM a.activity_date) = EXTRACT(YEAR FROM now())
    AND (
      _mode = 'all'
      OR (_mode = 'trainer' AND a.is_trainer = true)
      OR (_mode = 'outdoor' AND a.is_trainer = false)
    )
  GROUP BY a.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_member_statistics_filtered(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_statistics_filtered(text) TO authenticated;