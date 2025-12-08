-- Create yearly challenge settings table
CREATE TABLE public.yearly_challenge_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  target_under_40 INTEGER NOT NULL DEFAULT 4000,
  target_under_60 INTEGER NOT NULL DEFAULT 3000,
  target_over_60 INTEGER NOT NULL DEFAULT 2500,
  club_total_target INTEGER NOT NULL DEFAULT 70000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.yearly_challenge_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view challenge settings
CREATE POLICY "Anyone can view challenge settings"
  ON public.yearly_challenge_settings FOR SELECT
  USING (true);

-- Admins can manage challenge settings
CREATE POLICY "Admins can manage challenge settings"
  ON public.yearly_challenge_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_yearly_challenge_settings_updated_at
  BEFORE UPDATE ON public.yearly_challenge_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data for years 2025-2029
INSERT INTO public.yearly_challenge_settings (year, target_under_40, target_under_60, target_over_60, club_total_target)
VALUES 
  (2025, 3000, 2000, 1500, 50000),
  (2026, 4000, 3000, 2500, 70000),
  (2027, 4000, 3000, 2500, 70000),
  (2028, 4000, 3000, 2500, 70000),
  (2029, 4000, 3000, 2500, 70000);