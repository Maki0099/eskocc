import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

const NetworkStatus = () => {
  const { isOffline, wasOffline, resetWasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOffline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        resetWasOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline, resetWasOffline]);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-300",
        isOffline ? "bg-destructive" : "bg-green-600"
      )}
    >
      <div className="container max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
          {isOffline ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Jste offline – některé funkce nemusí fungovat</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              <span>Připojení obnoveno</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;
