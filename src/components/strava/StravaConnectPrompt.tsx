import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import stravaLogo from "@/assets/strava-logo.svg";

/**
 * Výzva k propojení osobního Strava účtu.
 * Zobrazí se jen členům, kteří ještě nemají propojeno (nebo propojení vypršelo).
 */
export const StravaConnectPrompt = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "hidden" | "missing" | "reauth">("loading");

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_strava_tokens" as any)
        .select("needs_reauth")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!data) setState("missing");
      else if ((data as any).needs_reauth) setState("reauth");
      else setState("hidden");
    };
    check();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user || state === "loading" || state === "hidden") return null;

  return (
    <div
      className={`p-4 rounded-2xl border border-border/60 bg-card/60 flex flex-col sm:flex-row sm:items-center gap-3 ${className}`}
      data-export-ignore="true"
    >
      <img src={stravaLogo} alt="Strava" className="h-5 w-auto shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm flex items-center gap-2">
          {state === "reauth" ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Propojení se Stravou vypršelo
            </>
          ) : (
            "Propoj si svůj Strava účet"
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bez propojení se tvoje kilometry a převýšení do statistik klubu nepočítají.
        </p>
      </div>
      <Button asChild variant="outline" className="rounded-xl h-10 shrink-0">
        <Link to="/account">{state === "reauth" ? "Propojit znovu" : "Propojit Stravu"}</Link>
      </Button>
    </div>
  );
};

export default StravaConnectPrompt;
