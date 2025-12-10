-- Create favorite_routes table for storing favorite cycling routes
CREATE TABLE public.favorite_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  distance_km INTEGER,
  elevation_m INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  terrain_type TEXT CHECK (terrain_type IN ('road', 'gravel', 'mtb', 'mixed')),
  route_link TEXT,
  gpx_file_url TEXT,
  cover_image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.favorite_routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view all routes"
ON public.favorite_routes
FOR SELECT
USING (
  has_role(auth.uid(), 'member'::app_role) OR 
  has_role(auth.uid(), 'active_member'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Active members can create routes"
ON public.favorite_routes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'active_member'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Creator or admin can update routes"
ON public.favorite_routes
FOR UPDATE
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Creator or admin can delete routes"
ON public.favorite_routes
FOR DELETE
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_favorite_routes_updated_at
BEFORE UPDATE ON public.favorite_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();