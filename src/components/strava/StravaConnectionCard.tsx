import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Unlink, AlertTriangle } from "lucide-react";
import stravaLogo from "@/assets/strava-logo.svg";

interface TokenRow {
  athlete_id: string;
  needs_reauth: boolean;
  last_synced_at: string | null;
  last_error: string | null;
}

const PROJECT_REF = "mtlycegceaeueuyymkyv";

export const StravaConnectionCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [row, setRow] = useState<TokenRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_strava_tokens" as any)
      .select("athlete_id, needs_reauth, last_synced_at, last_error")
      .eq("user_id", user.id)
      .maybeSingle();
    setRow((data as TokenRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    // Po návratu z OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("strava") === "connected") {
      toast({ title: "Strava propojena", description: "Spouštím první synchronizaci…" });
      // Vyčistit URL
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(load, 1500);
    } else if (params.get("strava") === "error") {
      toast({
        variant: "destructive",
        title: "Propojení se nezdařilo",
        description: params.get("reason") || "Neznámá chyba",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load, toast]);

  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const redirectUri = `https://${PROJECT_REF}.supabase.co/functions/v1/user-strava-callback`;
      const returnTo = window.location.origin;
      const { data, error } = await supabase.functions.invoke("user-strava-auth", {
        body: null,
        method: "GET" as any,
      });
      // invoke does not pass query params well; use direct fetch with auth
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `https://${PROJECT_REF}.supabase.co/functions/v1/user-strava-auth?redirect_uri=${encodeURIComponent(redirectUri)}&return_to=${encodeURIComponent(returnTo)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = await res.json();
      if (!res.ok || !payload.url) throw new Error(payload.error || "Selhalo získání URL");
      window.location.href = payload.url;
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: (e as Error).message,
      });
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("strava-stats-batch", {
        body: {},
      });
      if (error) throw error;
      toast({ title: "Synchronizováno", description: "Tvoje statistiky byly obnoveny." });
      await load();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Chyba synchronizace",
        description: (e as Error).message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if (!confirm("Opravdu odpojit Strava účet? Osobní statistiky se přestanou aktualizovat.")) return;
    setDisconnecting(true);
    const { error } = await supabase
      .from("user_strava_tokens" as any)
      .delete()
      .eq("user_id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Chyba", description: error.message });
    } else {
      toast({ title: "Odpojeno" });
      setRow(null);
    }
    setDisconnecting(false);
  };

  if (loading) return null;

  return (
    <div className="p-4 rounded-xl border border-border/60 bg-card/50">
      <div className="flex items-center gap-3 mb-3">
        <img src={stravaLogo} alt="Strava" className="h-5 w-auto" />
        <div className="flex-1">
          <p className="font-medium text-sm">Můj Strava účet</p>
          <p className="text-xs text-muted-foreground">
            Přesné osobní statistiky YTD přímo z tvého Strava účtu.
          </p>
        </div>
      </div>

      {!row && (
        <Button
          onClick={handleConnect}
          disabled={connecting}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2"
        >
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Propojit Strava účet
        </Button>
      )}

      {row && (
        <div className="space-y-2">
          {row.needs_reauth && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Propojení vypršelo. Klikni „Propojit znovu".
                {row.last_error && <div className="mt-1 opacity-70">{row.last_error}</div>}
              </div>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Athlete ID: <span className="font-mono">{row.athlete_id}</span>
            {row.last_synced_at && (
              <> · Poslední sync: {new Date(row.last_synced_at).toLocaleString("cs-CZ")}</>
            )}
          </div>
          <div className="flex gap-2">
            {row.needs_reauth ? (
              <Button onClick={handleConnect} disabled={connecting} variant="outline" className="flex-1 h-10 rounded-lg">
                {connecting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Propojit znovu
              </Button>
            ) : (
              <Button onClick={handleSync} disabled={syncing} variant="outline" className="flex-1 h-10 rounded-lg gap-2">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync teď
              </Button>
            )}
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="ghost"
              className="h-10 rounded-lg gap-2 text-muted-foreground"
            >
              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
              Odpojit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
