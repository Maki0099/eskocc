-- Function to normalize full_name to title case before insert/update
CREATE OR REPLACE FUNCTION public.normalize_full_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND NEW.full_name <> '' THEN
    NEW.full_name := initcap(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-capitalize full_name on every insert or update of profiles
CREATE TRIGGER normalize_full_name_trigger
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.normalize_full_name();