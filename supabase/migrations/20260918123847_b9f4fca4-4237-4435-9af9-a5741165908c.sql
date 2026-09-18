
REVOKE ALL ON FUNCTION public.get_member_statistics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_statistics() TO authenticated;
REVOKE ALL ON FUNCTION public.get_member_yearly_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_yearly_progress(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_member_duplicate_candidates() FROM anon;
REVOKE ALL ON FUNCTION public.set_member_activity_duplicate(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.get_member_strava_connections() FROM anon;
REVOKE ALL ON FUNCTION public.recalc_member_ytd() FROM anon, authenticated;
