-- Create cafe_menu_categories table for hierarchical categories
CREATE TABLE public.cafe_menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.cafe_menu_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cafe_menu_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Anyone can view categories" ON public.cafe_menu_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.cafe_menu_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add category_id to menu items (keep old category column for now)
ALTER TABLE public.cafe_menu_items 
ADD COLUMN category_id UUID REFERENCES public.cafe_menu_categories(id) ON DELETE SET NULL;