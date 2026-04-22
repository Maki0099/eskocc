import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegisterSW } from "virtual:pwa-register/react";

const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log("Service Worker registered:", swUrl);
      if (!r) return;

      // (a) Check immediately after registration
      r.update().catch(() => {});

      // (b) Periodic check every 60 minutes (battery friendly)
      const interval = setInterval(() => {
        r.update().catch(() => {});
      }, 60 * 60 * 1000);

      // (c) Check when user returns to the app (key for installed PWA)
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          r.update().catch(() => {});
        }
      };
      const onFocus = () => {
        r.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onFocus);

      cleanupRef.current = () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onFocus);
      };
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    // 1. Nuke runtime caches so user sees fresh data after reload.
    //    Workbox precache is managed by the SW itself — leave it alone.
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => !k.startsWith("workbox-precache"))
            .map((k) => caches.delete(k))
        );
      } catch (err) {
        console.warn("Cache cleanup failed:", err);
      }
    }

    // 2. Once the new SW takes control, ask it to reload ALL open clients
    //    (other tabs/windows of the PWA) so nothing stays on stale JS.
    //    Listener must be registered BEFORE skipWaiting fires.
    if ("serviceWorker" in navigator) {
      const onControllerChange = () => {
        navigator.serviceWorker.controller?.postMessage({
          type: "RELOAD_ALL_CLIENTS",
        });
        // Reload current tab too — SW message is async and may race.
        setTimeout(() => window.location.reload(), 100);
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange,
        { once: true }
      );
    }

    // 3. Activate the waiting SW (skipWaiting + clientsClaim).
    await updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] animate-in slide-in-from-bottom duration-300 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Nová verze k dispozici
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Aktualizujte aplikaci pro nejnovější funkce a opravy
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            Později
          </Button>
          <Button
            size="sm"
            onClick={handleUpdate}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualizovat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePrompt;
