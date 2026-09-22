import { useState } from "react";
import { RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { activateNewVersion, clearRuntimeCaches } from "@/lib/pwa-update";

/**
 * Vynutí stažení čerstvé verze aplikace:
 * - Nejdřív stáhne a aktivuje nový service worker
 * - Teprve potom vyčistí runtime cache (nikdy precache aplikace)
 * - Znovu načte stránku s cache-busting parametrem
 */
const ForceRefreshButton = () => {
  const [loading, setLoading] = useState(false);

  const handleForceRefresh = async () => {
    if (loading) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("Nejsi online", {
        description: "Obnovení aplikace vyžaduje připojení k internetu.",
      });
      return;
    }

    setLoading(true);
    const loadingId = toast.loading("Stahuji čerstvou verzi aplikace…");

    try {
      // 1. Stáhni a aktivuj novou verzi (precache zůstává, dokud nová nedoběhne)
      await activateNewVersion();

      // 2. Až teď ukliď dočasná data (obrázky, mapy, odpovědi serveru)
      await clearRuntimeCaches();

      toast.dismiss(loadingId);

      // 3. Reload s cache-busting parametrem
      const url = new URL(window.location.href);
      url.searchParams.set("_r", Date.now().toString());
      window.location.replace(url.toString());
    } catch (err) {
      console.error("Force refresh failed:", err);
      toast.dismiss(loadingId);
      toast.error("Obnovení se nezdařilo", {
        description:
          (err instanceof Error ? err.message : String(err)) +
          " — aplikace běží dál na stávající verzi.",
        action: {
          label: "Zkusit znovu",
          onClick: () => {
            void handleForceRefresh();
          },
        },
      });
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      onClick={handleForceRefresh}
      disabled={loading}
      className="w-full h-12 rounded-xl gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCcw className="w-4 h-4" />
      )}
      {loading ? "Obnovuji…" : "Vynutit obnovení aplikace"}
    </Button>
  );
};

export default ForceRefreshButton;
