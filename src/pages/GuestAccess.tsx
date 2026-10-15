import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

const GuestAccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("redeem-guest-link", {
        body: { token },
      });
      if (cancelled) return;
      if (error || !data?.token_hash) {
        setError("Tento odkaz už neplatí nebo neexistuje.");
        return;
      }
      await supabase.auth.signOut();
      const { error: vErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (cancelled) return;
      if (vErr) {
        setError("Přihlášení hosta se nepodařilo. Zkus odkaz otevřít znovu.");
        return;
      }
      navigate(ROUTES.STATISTICS, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-bold">Hostovský přístup skončil</h1>
          <p className="text-muted-foreground max-w-sm">{error}</p>
          <Button asChild>
            <Link to={ROUTES.HOME}>Na úvodní stránku</Link>
          </Button>
        </>
      ) : (
        <>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">Otevírám hostovský přístup…</p>
        </>
      )}
    </div>
  );
};

export default GuestAccess;
