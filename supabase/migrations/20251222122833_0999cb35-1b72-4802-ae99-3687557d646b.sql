-- Create table to cache Strava club group events
CREATE TABLE public.strava_club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_event_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  address TEXT,
  route_id TEXT,
  sport_type TEXT,
  organizing_athlete_id TEXT,
  organizing_athlete_name TEXT,
  participant_count INTEGER DEFAULT 0,
  women_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.strava_club_events ENABLE ROW LEVEL SECURITY;

-- Anyone can view strava club events (public data)
CREATE POLICY "Anyone can view strava club events"
ON public.strava_club_events
FOR SELECT
USING (true);

-- Only admins can manage strava club events (insert/update/delete via edge function)
CREATE POLICY "Admins can manage strava club events"
ON public.strava_club_events
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_strava_club_events_updated_at
BEFORE UPDATE ON public.strava_club_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on event_date for efficient querying
CREATE INDEX idx_strava_club_events_date ON public.strava_club_events(event_date);