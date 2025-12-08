-- Add cache columns to profiles table for Strava stats caching
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strava_ytd_distance integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS strava_ytd_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS strava_stats_cached_at timestamp with time zone;