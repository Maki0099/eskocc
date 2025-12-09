-- Create function to notify user when their membership is approved
CREATE OR REPLACE FUNCTION public.notify_user_membership_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when role changes from 'pending' to an approved role
  IF OLD.role = 'pending' AND NEW.role IN ('member', 'active_member', 'admin') THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      url,
      is_read
    ) VALUES (
      NEW.user_id,
      '🎉 Vítej v klubu ESKO.cc!',
      'Tvé členství bylo schváleno. Nyní máš přístup ke všem klubovým funkcím - vyjížďkám, statistikám a galerii.',
      'system',
      '/dashboard',
      false
    );
    
    RAISE LOG 'Sent welcome notification to user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table for membership approval
CREATE TRIGGER on_membership_approved
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_membership_approved();