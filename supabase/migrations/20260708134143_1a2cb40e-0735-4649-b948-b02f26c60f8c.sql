
-- Backfill full_name from auth.users metadata for members with missing full_name
UPDATE public.profiles p
SET full_name = initcap(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''))
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR TRIM(p.full_name) = '')
  AND NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), '') IS NOT NULL;

-- Update normalize trigger to convert empty strings to NULL
CREATE OR REPLACE FUNCTION public.normalize_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := NULLIF(TRIM(NEW.full_name), '');
    IF NEW.full_name IS NOT NULL THEN
      NEW.full_name := initcap(NEW.full_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
