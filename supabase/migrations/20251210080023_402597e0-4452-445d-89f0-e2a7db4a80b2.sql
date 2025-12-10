-- Create table for event notification subscriptions
CREATE TABLE public.event_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Enable Row Level Security
ALTER TABLE public.event_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions"
ON public.event_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Members can subscribe to events"
ON public.event_subscriptions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    has_role(auth.uid(), 'member') OR 
    has_role(auth.uid(), 'active_member') OR 
    has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can unsubscribe from events"
ON public.event_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Add to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_subscriptions;