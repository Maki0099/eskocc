-- Extend strava_club_events with additional Strava API data
ALTER TABLE public.strava_club_events
ADD COLUMN IF NOT EXISTS start_latlng jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS route_polyline text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS skill_level integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terrain integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS strava_route_id text DEFAULT NULL;

-- Extend events table to link to Strava events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS strava_event_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS strava_event_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS start_latlng jsonb DEFAULT NULL;

-- Add index for quick lookup of events by strava_event_id
CREATE INDEX IF NOT EXISTS idx_events_strava_event_id ON public.events(strava_event_id);

COMMENT ON COLUMN public.strava_club_events.start_latlng IS 'GPS coordinates of event start point [lat, lng]';
COMMENT ON COLUMN public.strava_club_events.route_polyline IS 'Encoded polyline from Strava route';
COMMENT ON COLUMN public.strava_club_events.skill_level IS 'Strava skill level: 1=casual, 2=tempo, 4=hammerfest';
COMMENT ON COLUMN public.strava_club_events.terrain IS 'Strava terrain: 0=road, 1=mixed, 2=mostly off road';
COMMENT ON COLUMN public.events.strava_event_id IS 'Link to original Strava event ID';
COMMENT ON COLUMN public.events.strava_event_url IS 'Direct URL to Strava event';
COMMENT ON COLUMN public.events.start_latlng IS 'GPS coordinates of event start point [lat, lng]';