-- Add new columns to events table for Strava data
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS sport_type text,
ADD COLUMN IF NOT EXISTS organizing_athlete_name text,
ADD COLUMN IF NOT EXISTS women_only boolean DEFAULT false;