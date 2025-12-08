-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to notify admin via edge function when new pending user is created
CREATE OR REPLACE FUNCTION public.notify_admin_new_pending_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger for pending role
  IF NEW.role != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- If URL not set, try to construct it from project ref
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://mtlycegceaeueuyymkyv.supabase.co';
  END IF;

  -- Call edge function via pg_net (fire and forget)
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/notify-admin-new-user',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'user_roles',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'role', NEW.role,
        'created_at', NEW.created_at
      ),
      'old_record', NULL
    )
  ) INTO request_id;

  RAISE LOG 'Sent notification request for new pending user %, request_id: %', NEW.user_id, request_id;

  RETURN NEW;
END;
$$;

-- Create trigger to call the function on new user_role insert
DROP TRIGGER IF EXISTS on_new_pending_user ON public.user_roles;
CREATE TRIGGER on_new_pending_user
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_pending_user();