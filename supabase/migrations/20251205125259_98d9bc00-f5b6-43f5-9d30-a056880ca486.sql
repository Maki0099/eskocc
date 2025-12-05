-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  route_link TEXT,
  gpx_file_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- Events policies: everyone can view, active_member+ can create, creator/admin can update/delete
CREATE POLICY "Anyone can view events"
ON public.events FOR SELECT
USING (true);

CREATE POLICY "Active members can create events"
ON public.events FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'active_member'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Creator or admin can update events"
ON public.events FOR UPDATE
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Creator or admin can delete events"
ON public.events FOR DELETE
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Participants policies
CREATE POLICY "Anyone can view participants"
ON public.event_participants FOR SELECT
USING (true);

CREATE POLICY "Members can join events"
ON public.event_participants FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    has_role(auth.uid(), 'member'::app_role) OR
    has_role(auth.uid(), 'active_member'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can update own participation"
ON public.event_participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own participation"
ON public.event_participants FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();