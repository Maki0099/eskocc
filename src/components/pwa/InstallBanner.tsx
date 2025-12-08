import { useState, useEffect } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWA_BANNER_DISMISSED_KEY = "pwa-banner-dismissed";
const PWA_BANNER_DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const InstallBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if banner was dismissed recently
    const dismissedAt = localStorage.getItem(PWA_BANNER_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < PWA_BANNER_DISMISS_DURATION) {
        return;
      }
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show banner after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome, listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(PWA_BANNER_DISMISSED_KEY, Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
      <div className="container max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                Nainstalujte si EskoCC
              </h3>
              
              {isIOS ? (
                <p className="text-xs text-muted-foreground mt-1 flex items-center flex-wrap gap-1">
                  Klikněte na
                  <Share className="w-3.5 h-3.5 inline" />
                  a poté
                  <span className="inline-flex items-center gap-0.5">
                    <Plus className="w-3.5 h-3.5" />
                    Přidat na plochu
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Rychlý přístup přímo z domovské obrazovky
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isIOS && deferredPrompt && (
                <Button
                  size="sm"
                  variant="apple"
                  onClick={handleInstall}
                  className="h-8 text-xs"
                >
                  Instalovat
                </Button>
              )}
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Zavřít"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
