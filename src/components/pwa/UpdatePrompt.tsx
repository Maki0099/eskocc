import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { clearRuntimeCaches } from "@/lib/pwa-update";

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

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("Nejsi online", {
        description: "Aktualizace vyžaduje připojení k internetu.",
      });
      return;
    }

    reloadingRef.current = true;
    const loadingId = toast.loading("Načítám novou verzi…");

    try {
      // Nejdřív stáhnout a aktivovat novou verzi, teprve pak uklidit dočasná data
      await updateServiceWorker(true);
      await clearRuntimeCaches();

      toast.dismiss(loadingId);
      window.location.reload();
    } catch (err) {
      console.error("Update failed:", err);
      toast.dismiss(loadingId);
      toast.error("Aktualizace se nezdařila", {
        description:
          (err instanceof Error ? err.message : String(err)) +
          " — aplikace běží dál na stávající verzi.",
        action: {
          label: "Zkusit znovu",
          onClick: () => {
            void applyUpdate();
          },
        },
      });
      reloadingRef.current = false;
    }
  };

  useEffect(() => {
    if (!needRefresh || toastShownRef.current || reloadingRef.current) return;
    toastShownRef.current = true;

    // Automaticky použít novou verzi po krátkém odpočtu — uživatel nemusí klikat.
    const timer = setTimeout(() => {
      void applyUpdate();
    }, 8000);

    toast("Je dostupná nová verze", {
      description: "Aplikace se za pár vteřin sama aktualizuje na nejnovější verzi.",
      duration: Infinity,
      action: {
        label: "Aktualizovat nyní",
        onClick: () => {
          clearTimeout(timer);
          void applyUpdate();
        },
      },
    });

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh]);

  return null;
};

export default UpdatePrompt;
