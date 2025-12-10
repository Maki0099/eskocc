-- Add column for caching monthly stats
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_monthly_stats jsonb DEFAULT NULL;