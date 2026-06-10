
-- 1) club_api_credentials: drop admin SELECT/UPDATE policies (tokens must not be reachable via Data API)
DROP POLICY IF EXISTS "Admins can view club credentials" ON public.club_api_credentials;
DROP POLICY IF EXISTS "Admins can update club credentials" ON public.club_api_credentials;

-- Safe status accessor for admin UI (excludes access_token/refresh_token)
CREATE OR REPLACE FUNCTION public.get_club_strava_status()
RETURNS TABLE (
  athlete_id text,
  expires_at timestamptz,
  updated_at timestamptz,
  needs_reauth boolean,
  last_error text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT c.athlete_id, c.expires_at, c.updated_at, c.needs_reauth, c.last_error
    FROM public.club_api_credentials c
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_club_strava_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_strava_status() TO authenticated;

-- 2) push_subscriptions: drop admin SELECT-all (keys/endpoints must not leak)
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.push_subscriptions;

-- Safe aggregate accessor for admin UI (only user_id + count)
CREATE OR REPLACE FUNCTION public.get_push_subscription_counts()
RETURNS TABLE (
  user_id uuid,
  subscription_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT ps.user_id, COUNT(*)::bigint AS subscription_count
    FROM public.push_subscriptions ps
    GROUP BY ps.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_push_subscription_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_push_subscription_counts() TO authenticated;
