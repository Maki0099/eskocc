DROP FUNCTION IF EXISTS public.get_member_yearly_progress(uuid);

CREATE OR REPLACE FUNCTION public.get_member_yearly_progress(_user_id uuid)
 RETURNS TABLE(day date, day_km numeric, cumulative_km numeric, target numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  v_target numeric;
  v_age_category text;
  v_year int := EXTRACT(YEAR FROM now())::int;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'member') OR
    has_role(auth.uid(), 'active_member') OR
    has_role(auth.uid(), 'admin')
  ) THEN
    RETURN;
  END IF;

  -- Determine age category from birth_date
  SELECT CASE
    WHEN p.birth_date IS NULL THEN 'under_40'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 60 THEN 'over_60'
    WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= 40 THEN 'under_60'
    ELSE 'under_40'
  END
  INTO v_age_category
  FROM public.profiles p
  WHERE p.id = _user_id;

  -- Get target for the current year based on age category
  SELECT CASE v_age_category
    WHEN 'over_60' THEN s.target_over_60
    WHEN 'under_60' THEN s.target_under_60
    ELSE s.target_under_40
  END
  INTO v_target
  FROM public.yearly_challenge_settings s
  WHERE s.year = v_year
  LIMIT 1;

  IF v_target IS NULL THEN
    v_target := 0;
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
    ROUND(SUM(km) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cumulative_km,
    v_target AS target
  FROM daily
  ORDER BY d;
END;
$function$;