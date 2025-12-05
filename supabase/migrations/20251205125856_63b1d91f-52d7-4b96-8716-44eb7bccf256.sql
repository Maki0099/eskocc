-- Create gallery_items table
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view gallery items
CREATE POLICY "Anyone can view gallery items"
ON public.gallery_items FOR SELECT
USING (true);

-- Members can upload photos
CREATE POLICY "Members can upload photos"
ON public.gallery_items FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    has_role(auth.uid(), 'member'::app_role) OR
    has_role(auth.uid(), 'active_member'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can delete their own photos, admins can delete any
CREATE POLICY "Users can delete own photos"
ON public.gallery_items FOR DELETE
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create storage bucket for gallery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true);

-- Storage policies
CREATE POLICY "Anyone can view gallery photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated users can upload gallery photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own gallery photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);