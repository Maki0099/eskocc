import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegisterSW } from "virtual:pwa-register/react";

const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log("Service Worker registered:", swUrl);
      // Check for updates every 5 minutes
      if (r) {
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
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
