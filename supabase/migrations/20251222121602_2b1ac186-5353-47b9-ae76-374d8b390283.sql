-- Add min/max elevation columns to favorite_routes
ALTER TABLE public.favorite_routes 
ADD COLUMN min_elevation integer,
ADD COLUMN max_elevation integer;

-- Add same columns to events for consistency
ALTER TABLE public.events 
ADD COLUMN min_elevation integer,
ADD COLUMN max_elevation integer;