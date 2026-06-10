import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Silent auto-updater.
 *
 * After publish:
 *  - SW detects a new build (immediately + on focus/visibility + hourly)
 *  - Runtime caches are wiped (Workbox precache is managed by the SW itself)
 *  - The waiting SW is activated (skipWaiting + clientsClaim)
 *  - All open tabs/windows reload so nobody stays on stale JS/CSS
 *
 * No user interaction required.
 */
const UpdatePrompt = () => {
  const cleanupRef = useRef<(() => void) | null>(null);
  const reloadingRef = useRef(false);

  const {
    needRefresh: [needRefresh],
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
    if (!needRefresh || reloadingRef.current) return;
    reloadingRef.current = true;

    void (async () => {
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

      // 2. Once the new SW takes control, reload current tab and ask
      //    other open tabs/windows to reload too.
      if ("serviceWorker" in navigator) {
        const onControllerChange = () => {
          navigator.serviceWorker.controller?.postMessage({
            type: "RELOAD_ALL_CLIENTS",
          });
          setTimeout(() => window.location.reload(), 100);
        };
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          onControllerChange,
          { once: true }
        );
      }

      // Subtle, non-blocking notice — UI reloads right after.
      toast.success("Načítám novou verzi…", { duration: 1500 });

      // 3. Activate the waiting SW (skipWaiting + clientsClaim).
      await updateServiceWorker(true);
    })();
  }, [needRefresh, updateServiceWorker]);

  return null;
};

export default UpdatePrompt;
