import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Detekce nové verze PWA + uživatelské hlášení s tlačítkem "Aktualizovat".
 *
 *  - SW kontroluje novou verzi (po registraci + při focus/visibility + každou hodinu)
 *  - Když je dostupná nová verze, zobrazí se trvalý toast s tlačítkem
 *  - Po kliknutí: vyčistí runtime cache, aktivuje nový SW a načte stránku
 */
const UpdatePrompt = () => {
  const cleanupRef = useRef<(() => void) | null>(null);
  const toastShownRef = useRef(false);
  const reloadingRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log("Service Worker registered:", swUrl);
      if (!r) return;

      r.update().catch(() => {});

      const interval = setInterval(() => {
        r.update().catch(() => {});
      }, 60 * 60 * 1000);

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

  const applyUpdate = async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;

    const loadingId = toast.loading("Načítám novou verzi…");

    try {
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

      await updateServiceWorker(true);

      // Fallback: pokud controllerchange neproběhne do 3 s, načti ručně
      setTimeout(() => {
        toast.dismiss(loadingId);
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error("Update failed:", err);
      toast.dismiss(loadingId);
      toast.error("Aktualizace se nezdařila. Zkus to prosím znovu.");
      reloadingRef.current = false;
    }
  };

  useEffect(() => {
    if (!needRefresh || toastShownRef.current || reloadingRef.current) return;
    toastShownRef.current = true;

    toast("Je dostupná nová verze", {
      description: "Aktualizuj pro načtení nejnovějších změn.",
      duration: Infinity,
      action: {
        label: "Aktualizovat",
        onClick: () => {
          void applyUpdate();
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh]);

  return null;
};

export default UpdatePrompt;
