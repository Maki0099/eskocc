import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType?: string;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    effectiveType: undefined,
  });

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection;
    setStatus((prev) => ({
      ...prev,
      effectiveType: connection?.effectiveType,
    }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        isOnline: true,
        wasOffline: !prev.isOnline ? true : prev.wasOffline,
        effectiveType: prev.effectiveType,
      }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes if available
    const connection = (navigator as any).connection;
    if (connection) {
      updateNetworkInfo();
      connection.addEventListener("change", updateNetworkInfo);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  const resetWasOffline = useCallback(() => {
    setStatus((prev) => ({ ...prev, wasOffline: false }));
  }, []);

  return {
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    wasOffline: status.wasOffline,
    effectiveType: status.effectiveType,
    resetWasOffline,
  };
};
