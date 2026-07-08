import { useState } from "react";
import { RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Vynutí stažení čerstvé verze aplikace:
 * - Vyčistí všechny caches (kromě workbox-precache pro rychlý restart)
 * - Aktualizuje service worker a aktivuje čekající verzi
 * - Znovu načte stránku s cache-busting parametrem
 */
const ForceRefreshButton = () => {
  const [loading, setLoading] = useState(false);

  const handleForceRefresh = async () => {
    if (loading) return;
    setLoading(true);
    const loadingId = toast.loading("Stahuji čerstvou verzi aplikace…");

    try {
      // 1. Smaž všechny cache úložiště
      if ("caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (err) {
          console.warn("Cache cleanup failed:", err);
        }
      }

      // 2. Zkontroluj a aktivuj nový service worker
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(async (reg) => {
              try {
                await reg.update();
                if (reg.waiting) {
                  reg.waiting.postMessage({ type: "SKIP_WAITING" });
                }
              } catch (err) {
                console.warn("SW update failed:", err);
              }
            })
          );
        } catch (err) {
          console.warn("SW registrations failed:", err);
        }
      }

      // 3. Krátká pauza aby SW stihl aktivovat novou verzi
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.dismiss(loadingId);

      // 4. Reload s cache-busting parametrem
      const url = new URL(window.location.href);
      url.searchParams.set("_r", Date.now().toString());
      window.location.replace(url.toString());
    } catch (err) {
      console.error("Force refresh failed:", err);
      toast.dismiss(loadingId);
      toast.error("Obnovení se nezdařilo. Zkus to prosím znovu.");
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
