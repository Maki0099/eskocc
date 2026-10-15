import { useEffect, useState } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";

/** Shows the guest expiry bar and signs the guest out once access ends. */
const GuestBanner = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setExpiresAt(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.rpc("get_guest_access_status");
      const row = Array.isArray(data) ? data[0] : null;
      if (cancelled || !row?.is_guest) return;
      if (!row.active) {
        await signOut();
        toast.error("Hostovský přístup skončil");
        navigate(ROUTES.HOME, { replace: true });
        return;
      }
      setExpiresAt(row.expires_at);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user, signOut, navigate]);

  if (!expiresAt) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] bg-accent text-accent-foreground text-center text-xs sm:text-sm py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
      Hostovský přístup do {format(new Date(expiresAt), "d. M. yyyy H:mm", { locale: cs })}
    </div>
  );
};

export default GuestBanner;
