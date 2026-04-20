
-- 1. Dedup existujících záznamů (kdyby v budoucnu byly duplicity)
DELETE FROM public.club_activities a
USING public.club_activities b
WHERE a.ctid < b.ctid AND a.fingerprint = b.fingerprint;

DELETE FROM public.club_athlete_mappings a
USING public.club_athlete_mappings b
WHERE a.ctid < b.ctid AND a.athlete_key = b.athlete_key;

-- 2. UNIQUE constrainty pro spolehlivý upsert
ALTER TABLE public.club_activities
  ADD CONSTRAINT club_activities_fingerprint_unique UNIQUE (fingerprint);

ALTER TABLE public.club_athlete_mappings
  ADD CONSTRAINT club_athlete_mappings_athlete_key_unique UNIQUE (athlete_key);

-- 3. Batch YTD recalc funkce — atomicky přepočítá YTD pro všechny členy.
-- Nuluje členy bez aktivit v aktuálním roce (řeší přelom roku i odpárování).
CREATE OR REPLACE FUNCTION public.recalc_club_ytd()
RETURNS TABLE(users_updated integer, users_zeroed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_start timestamptz := date_trunc('year', now());
  v_now timestamptz := now();
  v_updated integer := 0;
  v_zeroed integer := 0;
BEGIN
  -- A) Set YTD pro uživatele s aktivitami v aktuálním roce
  WITH totals AS (
    SELECT matched_user_id AS uid,
           COALESCE(SUM(distance_m), 0) AS dist_m,
           COUNT(*) AS cnt
    FROM public.club_activities
    WHERE matched_user_id IS NOT NULL
      AND activity_date >= v_year_start
    GROUP BY matched_user_id
  ),
  upd AS (
    UPDATE public.profiles p
    SET strava_ytd_distance = ROUND(t.dist_m / 1000.0)::int,
        strava_ytd_count = t.cnt::int,
        strava_stats_cached_at = v_now
    FROM totals t
    WHERE p.id = t.uid
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_updated FROM upd;

  -- B) Vynulovat YTD všem členům, kteří letos nemají žádnou aktivitu
  WITH zeroed AS (
    UPDATE public.profiles p
    SET strava_ytd_distance = 0,
        strava_ytd_count = 0,
        strava_stats_cached_at = v_now
    WHERE p.id IN (SELECT user_id FROM public.user_roles WHERE role IN ('member','active_member','admin'))
      AND p.id NOT IN (
        SELECT matched_user_id FROM public.club_activities
        WHERE matched_user_id IS NOT NULL AND activity_date >= v_year_start
      )
      AND (COALESCE(p.strava_ytd_distance, 0) <> 0 OR COALESCE(p.strava_ytd_count, 0) <> 0)
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_zeroed FROM zeroed;

  RETURN QUERY SELECT v_updated, v_zeroed;
END;
$$;
