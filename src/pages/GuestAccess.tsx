import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/routes";

export const GUEST_NAME_KEY = "esko_guest_name";

const GuestAccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem(GUEST_NAME_KEY) ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.functions
      .invoke("redeem-guest-link", { body: { token, check: true } })
      .then(({ data, error }) => {
        if (error || !data?.ok) setError("Tento odkaz už neplatí nebo neexistuje.");
        else setReady(true);
      });
  }, [token]);

  const enter = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("redeem-guest-link", {
      body: { token, name: n },
    });
    if (error || !data?.token_hash) {
      setBusy(false);
      return setError("Tento odkaz už neplatí nebo neexistuje.");
    }
    await supabase.auth.signOut();
    const { error: vErr } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: "magiclink",
    });
    if (vErr) {
      setBusy(false);
      return setError("Přihlášení hosta se nepodařilo. Zkus odkaz otevřít znovu.");
    }
    localStorage.setItem(GUEST_NAME_KEY, n);
    navigate(ROUTES.STATISTICS, { replace: true });
  };

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
      ) : ready ? (
        <form onSubmit={enter} className="w-full max-w-sm space-y-4 text-left">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Vítej v ESKO.cc</h1>
            <p className="text-muted-foreground text-sm">Pro vstup jako host napiš své jméno.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="guest-name">Jméno a příjmení</Label>
            <Input id="guest-name" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Jan Novák" />
          </div>
          <Button type="submit" className="w-full" disabled={busy || name.trim().length < 2}>
            {busy ? "Otevírám…" : "Vstoupit"}
          </Button>
        </form>
      ) : (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      )}
    </div>
  );
};

export default GuestAccess;
