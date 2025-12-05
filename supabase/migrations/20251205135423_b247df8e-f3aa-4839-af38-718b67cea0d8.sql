-- Cafe opening hours table
CREATE TABLE public.cafe_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL UNIQUE CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_closed boolean DEFAULT false,
  open_time time,
  close_time time,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Cafe menu items table
CREATE TABLE public.cafe_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL,
  category text NOT NULL,
  is_available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Cafe gallery table
CREATE TABLE public.cafe_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  file_name text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cafe_opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_gallery ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Anyone can view opening hours" ON public.cafe_opening_hours FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu items" ON public.cafe_menu_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view cafe gallery" ON public.cafe_gallery FOR SELECT USING (true);

-- Admin write access policies
CREATE POLICY "Admins can manage opening hours" ON public.cafe_opening_hours FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage menu items" ON public.cafe_menu_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage cafe gallery" ON public.cafe_gallery FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default opening hours
INSERT INTO public.cafe_opening_hours (day_of_week, is_closed, open_time, close_time) VALUES
  (0, false, '09:00', '19:00'),  -- Neděle
  (1, true, NULL, NULL),         -- Pondělí - zavřeno
  (2, false, '10:00', '19:00'),  -- Úterý
  (3, false, '10:00', '19:00'),  -- Středa
  (4, false, '10:00', '19:00'),  -- Čtvrtek
  (5, false, '09:00', '20:00'),  -- Pátek
  (6, false, '09:00', '20:00');  -- Sobota

-- Insert sample menu items
INSERT INTO public.cafe_menu_items (name, price, category, sort_order) VALUES
  ('Espresso', 49, 'Káva Vergnano', 1),
  ('Doppio', 59, 'Káva Vergnano', 2),
  ('Americano', 55, 'Káva Vergnano', 3),
  ('Cappuccino', 65, 'Káva Vergnano', 4),
  ('Caffé Latte', 69, 'Káva Vergnano', 5),
  ('Flat White', 75, 'Káva Vergnano', 6),
  ('Ice Cappuccino', 85, 'Ledové kávy', 10),
  ('Ice Vanilkové Latte', 95, 'Ledové kávy', 11),
  ('Matcha (Jahoda/Malina/Mango)', 99, 'Matcha', 20),
  ('Horká čokoláda', 79, 'Horká čokoláda', 30),
  ('Čaj Earl Grey', 55, 'Čaj', 40),
  ('Čaj Zelený', 55, 'Čaj', 41),
  ('Čaj Ovocný', 55, 'Čaj', 42);

-- Trigger for updated_at
CREATE TRIGGER update_cafe_opening_hours_updated_at
  BEFORE UPDATE ON public.cafe_opening_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafe_menu_items_updated_at
  BEFORE UPDATE ON public.cafe_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();