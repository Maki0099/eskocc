-- 1. Create mappings table
CREATE TABLE public.club_athlete_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_key text NOT NULL UNIQUE,
  athlete_firstname text NOT NULL,
  athlete_lastname_initial text,
  matched_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ignored boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_athlete_mappings_user ON public.club_athlete_mappings(matched_user_id);

ALTER TABLE public.club_athlete_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage athlete mappings"
  ON public.club_athlete_mappings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view athlete mappings"
  ON public.club_athlete_mappings
  FOR SELECT
  USING (
    has_role(auth.uid(), 'member'::app_role)
    OR has_role(auth.uid(), 'active_member'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_club_athlete_mappings_updated_at
  BEFORE UPDATE ON public.club_athlete_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed from existing club_activities
INSERT INTO public.club_athlete_mappings (athlete_key, athlete_firstname, athlete_lastname_initial, matched_user_id)
SELECT
  lower(trim(athlete_firstname)) || '|' || lower(trim(coalesce(athlete_lastname_initial, ''))) AS athlete_key,
  athlete_firstname,
  athlete_lastname_initial,
  -- pick most common matched_user_id per athlete (mode)
  (array_agg(matched_user_id ORDER BY matched_user_id NULLS LAST))[1] AS matched_user_id
FROM public.club_activities
WHERE athlete_firstname IS NOT NULL
GROUP BY 1, 2, 3
ON CONFLICT (athlete_key) DO NOTHING;