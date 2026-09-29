import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface SyncNowButtonProps {
  onSynced?: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  label?: string;
}

const SyncNowButton = ({
  onSynced,
  variant = "outline",
  className,
  label = "Načíst jízdy teď",
}: SyncNowButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-member-activities", {
        body: {},
      });
      if (error) throw error;

      const result = (data as any)?.results?.[0];
      if (result && result.ok === false) {
        const reason =
          result.reason === "needs_reauth"
            ? "Propojení se Stravou vypršelo, propoj účet znovu v nastavení."
            : "Strava teď nevrátila data, zkus to prosím za chvíli.";
        toast({ variant: "destructive", title: "Nepodařilo se načíst jízdy", description: reason });
        return;
      }

      toast({
        title: "Hotovo",
        description:
          typeof result?.imported === "number"
            ? `Načteno ${result.imported} jízd a přepočítány statistiky.`
            : "Jízdy i statistiky jsou aktuální.",
      });
      onSynced?.();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Nepodařilo se načíst jízdy",
        description: (e as Error).message,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={syncing} variant={variant} className={className}>
      {syncing ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <RefreshCw className="w-4 h-4 mr-2" />
      )}
      {syncing ? "Načítám…" : label}
    </Button>
  );
};

export default SyncNowButton;
