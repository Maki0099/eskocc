import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Download, Share, Plus, CheckCircle2, Smartphone, Monitor, ChevronDown } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Smartphone, title: "Nativní zážitek", description: "Aplikace běží jako nativní aplikace na vašem zařízení" },
    { icon: Download, title: "Rychlý přístup", description: "Spusťte aplikaci přímo z domovské obrazovky" },
    { icon: Monitor, title: "Plná obrazovka", description: "Bez rušivých prvků prohlížeče" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Nainstalujte si EskoCC
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Získejte rychlejší přístup k aplikaci přímo z domovské obrazovky vašeho zařízení.
            </p>
          </motion.div>

          {isInstalled ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Aplikace je nainstalována</h2>
              <p className="text-muted-foreground">
                EskoCC je již nainstalováno na vašem zařízení. Spusťte ji z domovské obrazovky.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="h-full text-center">
                      <CardHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                          <feature.icon className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Install Instructions */}
              <div className="space-y-6">
                {/* Android / Chrome */}
                {(isAndroid || deferredPrompt) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="w-5 h-5" />
                          Instalace na Android / Chrome
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {deferredPrompt ? (
                          <Button onClick={handleInstallClick} size="lg" className="w-full sm:w-auto">
                            <Download className="w-4 h-4 mr-2" />
                            Nainstalovat aplikaci
                          </Button>
                        ) : (
                          <ol className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">1</span>
                              <span>Klikněte na tlačítko menu (tři tečky) v pravém horním rohu prohlížeče</span>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">2</span>
                              <span>Vyberte možnost "Nainstalovat aplikaci" nebo "Přidat na domovskou obrazovku"</span>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">3</span>
                              <span>Potvrďte instalaci</span>
                            </li>
                          </ol>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* iOS */}
                {isIOS && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Share className="w-5 h-5" />
                          Instalace na iPhone / iPad
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-4 text-muted-foreground">
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">1</span>
                            <div>
                              <span>Klikněte na tlačítko sdílení</span>
                              <Share className="inline-block w-4 h-4 mx-1 text-primary" />
                              <span>v dolní části Safari</span>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">2</span>
                            <div>
                              <span>Scrollujte dolů</span>
                              <ChevronDown className="inline-block w-4 h-4 mx-1 text-primary" />
                              <span>a vyberte "Přidat na plochu"</span>
                              <Plus className="inline-block w-4 h-4 mx-1 text-primary" />
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">3</span>
                            <span>Klikněte na "Přidat" v pravém horním rohu</span>
                          </li>
                        </ol>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Desktop fallback */}
                {!isIOS && !isAndroid && !deferredPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Monitor className="w-5 h-5" />
                          Instalace na počítači
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-3 text-muted-foreground">
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">1</span>
                            <span>V adresním řádku prohlížeče Chrome vyhledejte ikonu instalace</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">2</span>
                            <span>Případně klikněte na menu (tři tečky) a vyberte "Nainstalovat EskoCC"</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">3</span>
                            <span>Potvrďte instalaci v dialogovém okně</span>
                          </li>
                        </ol>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Install;
