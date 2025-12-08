-- Členové mohou vidět základní údaje jiných členů
CREATE POLICY "Members can view other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'member'::app_role) OR 
  has_role(auth.uid(), 'active_member'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);