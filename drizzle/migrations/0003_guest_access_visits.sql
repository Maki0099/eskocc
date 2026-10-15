CREATE TABLE public.guest_access_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.guest_access_links(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guest_access_visits TO authenticated;
GRANT ALL ON public.guest_access_visits TO service_role;
ALTER TABLE public.guest_access_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read guest visits" ON public.guest_access_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ON public.guest_access_visits(link_id, created_at DESC);