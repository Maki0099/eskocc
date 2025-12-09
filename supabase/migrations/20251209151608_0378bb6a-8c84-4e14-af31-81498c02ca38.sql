-- Add push_enabled preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true;

-- Allow admins to view all push subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any subscription
DROP POLICY IF EXISTS "Admins can delete any subscription" ON public.push_subscriptions;
CREATE POLICY "Admins can delete any subscription" 
ON public.push_subscriptions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

COMMENT ON COLUMN public.profiles.push_notifications_enabled IS 'User preference for push notifications';