
CREATE INDEX IF NOT EXISTS idx_club_activities_user_date
  ON public.club_activities (matched_user_id, activity_date);

CREATE OR REPLACE FUNCTION public.get_member_yearly_progress(_user_id uuid)
RETURNS TABLE(day date, day_km numeric, cumulative_km numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'member') OR
    has_role(auth.uid(), 'active_member') OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH daily AS (
    SELECT
      date_trunc('day', activity_date)::date AS d,
      SUM(distance_m)::numeric / 1000.0 AS km
    FROM public.club_activities
    WHERE matched_user_id = _user_id
      AND activity_date >= date_trunc('year', now())
      AND activity_date < date_trunc('year', now()) + interval '1 year'
    GROUP BY 1
  )
  SELECT
    d AS day,
    ROUND(km, 1) AS day_km,
    ROUND(SUM(km) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cumulative_km
  FROM daily
  ORDER BY d;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_yearly_progress(uuid) TO authenticated;
