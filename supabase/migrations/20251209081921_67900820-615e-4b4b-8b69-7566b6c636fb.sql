-- Add column to track Strava club membership
ALTER TABLE public.profiles 
ADD COLUMN is_strava_club_member boolean DEFAULT false;