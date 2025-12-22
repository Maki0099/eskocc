import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Camera, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface QrScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (url: string) => void;
}

const SUPPORTED_DOMAINS = [
  "mapy.cz",
  "mapy.com",
  "connect.garmin.com",
  "ridewithgps.com",
  "strava.com",
  "komoot.com",
  "wikiloc.com",
  "alltrails.com",
  "trailforks.com",
  "bicycle.holiday",
];

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSupportedService(url: string): { supported: boolean; domain?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a GPX file
    if (url.toLowerCase().endsWith(".gpx")) {
      return { supported: true, domain: "GPX soubor" };
    }
    
    // Check supported domains
    for (const domain of SUPPORTED_DOMAINS) {
      if (hostname.includes(domain)) {
        return { supported: true, domain };
      }
    }
    
    return { supported: false };
  } catch {
    return { supported: false };
  }
}

export function QrScanner({ open, onClose, onScan }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.error("Error stopping scanner:", e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    setScanError(null);
    setScannedUrl(null);
    setIsLoading(true);
    
    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!containerRef.current) {
      setScanError("Nepodařilo se inicializovat scanner");
      setIsLoading(false);
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");
      
      setIsScanning(true);
      setIsLoading(false);
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // QR code not found - this is called frequently, no need to handle
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setIsScanning(false);
      setIsLoading(false);
      
      if (err instanceof Error) {
        if (err.message.includes("NotAllowedError") || err.message.includes("Permission")) {
          setScanError("Přístup ke kameře byl zamítnut. Povolte přístup v nastavení prohlížeče.");
        } else if (err.message.includes("NotFoundError")) {
          setScanError("Kamera nebyla nalezena. Zkuste nahrát obrázek s QR kódem.");
        } else {
          setScanError("Nepodařilo se spustit kameru. Zkuste nahrát obrázek.");
        }
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanner();
    
    if (!isValidUrl(decodedText)) {
      setScanError(`Naskenovaný text není platná URL: "${decodedText.substring(0, 50)}${decodedText.length > 50 ? '...' : ''}"`);
      return;
    }

    const serviceCheck = isSupportedService(decodedText);
    setScannedUrl(decodedText);
    
    if (!serviceCheck.supported) {
      setScanError("URL není z podporované služby, ale můžete ji zkusit importovat.");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setScannedUrl(null);
    setIsLoading(true);

    try {
      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-file-reader");
      
      const result = await scanner.scanFile(file, true);
      handleScanSuccess(result);
      
      scanner.clear();
    } catch (err) {
      console.error("File scan error:", err);
      setScanError("Nepodařilo se načíst QR kód z obrázku. Zkontrolujte, že obrázek obsahuje čitelný QR kód.");
    } finally {
      setIsLoading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    if (scannedUrl) {
      onScan(scannedUrl);
      handleClose();
    }
  };

  const handleClose = async () => {
    await stopScanner();
    setScannedUrl(null);
    setScanError(null);
    onClose();
  };

  const handleRetry = () => {
    setScannedUrl(null);
    setScanError(null);
    startScanner();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Stop scanner when dialog closes
  useEffect(() => {
    if (!open) {
      stopScanner();
    }
  }, [open]);

  const serviceCheck = scannedUrl ? isSupportedService(scannedUrl) : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Naskenovat QR kód
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container */}
          {!scannedUrl && (
            <>
              <div 
                ref={containerRef}
                id="qr-reader" 
                className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
              />
              
              {/* Hidden div for file scanning */}
              <div id="qr-file-reader" className="hidden" />
              
              {!isScanning && !scanError && (
                <div className="flex flex-col gap-2">
                  <Button onClick={startScanner} className="gap-2">
                    <Camera className="w-4 h-4" />
                    Spustit kameru
                  </Button>
                  
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Button variant="outline" className="w-full gap-2">
                      <Upload className="w-4 h-4" />
                      Nahrát obrázek s QR kódem
                    </Button>
                  </div>
                </div>
              )}
              
              {isScanning && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Hledám QR kód...
                </div>
              )}
            </>
          )}

          {/* Scan result */}
          {scannedUrl && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  {serviceCheck?.supported ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {serviceCheck?.supported 
                        ? `Nalezena URL (${serviceCheck.domain})`
                        : "Nalezena URL (neznámá služba)"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground break-all mt-1">
                      {scannedUrl}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  Skenovat znovu
                </Button>
                <Button onClick={handleConfirm} className="flex-1">
                  Použít URL
                </Button>
              </div>
            </div>
          )}

          {/* Error message */}
          {scanError && !scannedUrl && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{scanError}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Zkusit znovu
                </Button>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="sm" className="gap-1">
                    <Upload className="w-3 h-3" />
                    Nahrát obrázek
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground text-center">
            Podporované služby: Mapy.cz, Garmin Connect, RideWithGPS, Strava, Komoot, Wikiloc a další
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
