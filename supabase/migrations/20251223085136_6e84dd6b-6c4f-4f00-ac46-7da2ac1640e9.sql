-- Add source_event_id to favorite_routes (links to the event this route was created from)
ALTER TABLE favorite_routes 
ADD COLUMN source_event_id uuid REFERENCES events(id) ON DELETE SET NULL;

-- Add source_route_id to events (links to the route this event was created from)
ALTER TABLE events 
ADD COLUMN source_route_id uuid REFERENCES favorite_routes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_favorite_routes_source_event_id ON favorite_routes(source_event_id);
CREATE INDEX idx_events_source_route_id ON events(source_route_id);