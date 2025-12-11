-- Add route_id column to gallery_items for favorite routes photos
ALTER TABLE public.gallery_items 
ADD COLUMN route_id uuid REFERENCES public.favorite_routes(id) ON DELETE CASCADE;