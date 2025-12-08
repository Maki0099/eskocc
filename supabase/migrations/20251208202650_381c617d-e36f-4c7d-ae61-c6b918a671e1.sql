-- Update handle_new_user function to include birth_date and phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with all fields from metadata
  INSERT INTO public.profiles (id, email, full_name, nickname, birth_date, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'nickname',
    (NEW.raw_user_meta_data ->> 'birth_date')::date,
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  -- Assign pending role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pending');
  
  RETURN NEW;
END;
$$;