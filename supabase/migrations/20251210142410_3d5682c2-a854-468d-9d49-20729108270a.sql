-- Add new columns to events table for route parameters and cover image
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS distance_km integer,
ADD COLUMN IF NOT EXISTS elevation_m integer,
ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS terrain_type text CHECK (terrain_type IN ('road', 'gravel', 'mtb', 'mixed'));

-- Create storage bucket for event files (GPX and cover images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for events bucket
CREATE POLICY "Anyone can view event files"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

CREATE POLICY "Active members can upload event files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'events' 
  AND (
    has_role(auth.uid(), 'active_member'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Active members can update their event files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'events' 
  AND (
    has_role(auth.uid(), 'active_member'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Active members can delete event files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'events' 
  AND (
    has_role(auth.uid(), 'active_member'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);