import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { startStravaOAuth } from "@/lib/strava-oauth";
import stravaLogo from "@/assets/strava-logo.svg";

const LATER_DAYS = 7;

/**
 * Modální výzva k propojení osobního Strava účtu.
 * Zobrazí se po přihlášení členu, který ještě nemá propojeno
 * (nebo mu propojení vypršelo). „Později" odloží výzvu o 7 dní.
 */
export const StravaConnectModal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const laterKey = `strava_connect_later_${user.id}`;
    const check = async () => {
      const laterUntil = localStorage.getItem(laterKey);
      if (laterUntil && new Date(laterUntil) > new Date()) return;

      const { data } = await supabase
        .from("user_strava_tokens" as any)
        .select("needs_reauth")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !(data as any).needs_reauth) return; // propojeno a v pořádku
      setReauth(Boolean(data && (data as any).needs_reauth));
      setOpen(true);
    };
    check();
  }, [user]);

  if (!user) return null;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await startStravaOAuth();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: (e as Error).message,
      });
      setConnecting(false);
      setOpen(false);
      navigate("/account");
    }
  };

  const handleLater = () => {
    const later = new Date();
    later.setDate(later.getDate() + LATER_DAYS);
    localStorage.setItem(`strava_connect_later_${user.id}`, later.toISOString());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <img src={stravaLogo} alt="Strava" className="h-7 w-auto" />
          </div>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {reauth && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {reauth ? "Propojení se Stravou vypršelo" : "Propoj si Stravu"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Bez propojení se tvoje kilometry a převýšení nepočítají do statistik klubu.
            Propojení zabere jen chvíli — potvrdíš ho na stránce Stravy a vrátíš se zpět.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full h-11 rounded-xl gap-2"
          >
            {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
            {reauth ? "Propojit znovu" : "Propojit Stravu"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            className="w-full h-10 rounded-xl text-muted-foreground"
          >
            Později
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StravaConnectModal;
