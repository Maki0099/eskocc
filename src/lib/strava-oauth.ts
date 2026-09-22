import { supabase } from "@/integrations/supabase/client";

const PROJECT_REF = "mtlycegceaeueuyymkyv";

/**
 * Spustí OAuth tok propojení osobního Strava účtu.
 * Přesměruje prohlížeč na autorizační stránku Stravy.
 * Vrací chybu jako výjimku, aby ji volající mohl zobrazit.
 */
export const startStravaOAuth = async (): Promise<void> => {
  const redirectUri = `https://${PROJECT_REF}.supabase.co/functions/v1/user-strava-callback`;
  const returnTo = window.location.origin;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch(
    `https://${PROJECT_REF}.supabase.co/functions/v1/user-strava-auth?redirect_uri=${encodeURIComponent(redirectUri)}&return_to=${encodeURIComponent(returnTo)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const payload = await res.json();
  if (!res.ok || !payload.url) throw new Error(payload.error || "Selhalo získání URL");
  window.location.href = payload.url;
};
