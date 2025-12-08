-- Add Strava token columns to profiles
ALTER TABLE public.profiles
ADD COLUMN strava_access_token TEXT,
ADD COLUMN strava_refresh_token TEXT,
ADD COLUMN strava_token_expires_at TIMESTAMP WITH TIME ZONE;