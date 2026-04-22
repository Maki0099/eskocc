import { useRef, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRegisterSW } from "virtual:pwa-register/react";

const CheckForUpdatesButton = () => {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>();
  const hadWaitingRef = useRef(false);

  const {
    needRefresh: [needRefresh],
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      registrationRef.current = r;
    },
  });

  const handleCheck = async () => {
    setChecking(true);
    const reg = registrationRef.current;

    if (!reg) {
      toast({
        title: "Aktualizace nejsou dostupné",
        description:
          "Service Worker není zaregistrován. Tato funkce funguje pouze v nainstalované PWA nebo v produkci.",
      });
      setChecking(false);
      return;
    }

    hadWaitingRef.current = !!reg.waiting;

    try {
      await reg.update();
      // Give the browser a moment to evaluate the new SW
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const hasNewVersion =
        needRefresh || (!!reg.waiting && !hadWaitingRef.current) || !!reg.installing;

      if (hasNewVersion) {
        toast({
          title: "Je dostupná nová verze",
          description: "Klikni na „Aktualizovat“ v promptu pro nasazení.",
        });
      } else {
        toast({
          title: "Jsi na nejnovější verzi",
          description: "Aplikace je aktuální.",
        });
      }
    } catch (err) {
      console.error("Update check failed:", err);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Kontrola aktualizací se nezdařila.",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleCheck}
      disabled={checking}
      className="w-full h-12 rounded-xl gap-2"
    >
      {checking ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      {checking ? "Kontroluji..." : "Zkontrolovat aktualizace"}
    </Button>
  );
};

export default CheckForUpdatesButton;
