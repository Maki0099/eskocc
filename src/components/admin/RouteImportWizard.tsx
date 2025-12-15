import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Search,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Route,
  FileUp,
  ChevronDown,
  Bike,
  Map,
  Mountain,
  MapPin,
  Compass,
  Watch,
  TreePine,
  Scan,
  ExternalLink,
  Zap,
  ClipboardCheck,
  RotateCcw,
  Globe,
  Upload,
  Sparkles,
  Pencil,
  ImagePlus,
  Camera,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RouteReviewCard, EditableRoute, GeneratedImage } from "./RouteReviewCard";
import {
  RouteCompletionIndicator,
  calculateCompletionScore,
} from "./RouteCompletionIndicator";
import {
  parseGpxMetadata,
  calculateDifficulty,
  generateStaticMapUrl,
  readFileAsBase64,
  GpxMetadata,
} from "@/lib/gpx-utils";

type GpxStatus = "available" | "auth-required" | "premium" | "varies" | "detection";
type ImportSource = "url" | "gpx";
type GpxImportMode = "auto" | "manual";

interface SupportedService {
  id: string;
  name: string;
  icon: React.ElementType;
  url: string;
  gpxStatus: GpxStatus;
  description: string;
}

const SUPPORTED_SERVICES: SupportedService[] = [
  {
    id: "bicycle-holiday",
    name: "bicycle.holiday",
    icon: Bike,
    url: "https://bicycle.holiday",
    gpxStatus: "available",
    description: "České cyklotrasy",
  },
  {
    id: "ridewithgps",
    name: "RideWithGPS",
    icon: Route,
    url: "https://ridewithgps.com",
    gpxStatus: "available",
    description: "Veřejné trasy dostupné",
  },
  {
    id: "strava",
    name: "Strava",
    icon: Mountain,
    url: "https://strava.com",
    gpxStatus: "auth-required",
    description: "Trasy a segmenty",
  },
  {
    id: "komoot",
    name: "Komoot",
    icon: Compass,
    url: "https://komoot.com",
    gpxStatus: "auth-required",
    description: "Plánování túr",
  },
  {
    id: "mapy-cz",
    name: "Mapy.cz / Mapy.com",
    icon: MapPin,
    url: "https://mapy.cz",
    gpxStatus: "available",
    description: "Zkrácené i plné URL, GPX export",
  },
  {
    id: "wikiloc",
    name: "Wikiloc",
    icon: Map,
    url: "https://wikiloc.com",
    gpxStatus: "premium",
    description: "Světové stezky",
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    icon: Watch,
    url: "https://connect.garmin.com",
    gpxStatus: "auth-required",
    description: "Garmin kurzy",
  },
  {
    id: "alltrails",
    name: "AllTrails",
    icon: TreePine,
    url: "https://alltrails.com",
    gpxStatus: "premium",
    description: "Turistické stezky",
  },
  {
    id: "trailforks",
    name: "Trailforks",
    icon: Mountain,
    url: "https://trailforks.com",
    gpxStatus: "premium",
    description: "MTB stezky",
  },
  {
    id: "generic",
    name: "Ostatní",
    icon: Scan,
    url: "",
    gpxStatus: "detection",
    description: "Auto-detekce embedů",
  },
];

const getGpxStatusBadge = (status: GpxStatus) => {
  switch (status) {
    case "available":
      return (
        <Badge variant="default" className="bg-green-600 text-xs">
          GPX dostupný
        </Badge>
      );
    case "auth-required":
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-600/20 text-yellow-600 text-xs"
        >
          Vyžaduje přihlášení
        </Badge>
      );
    case "premium":
      return (
        <Badge
          variant="secondary"
          className="bg-orange-600/20 text-orange-600 text-xs"
        >
          Premium účet
        </Badge>
      );
    case "varies":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-600/20 text-blue-600 text-xs"
        >
          Závisí na URL
        </Badge>
      );
    case "detection":
      return (
        <Badge variant="outline" className="text-xs">
          Auto-detekce
        </Badge>
      );
  }
};

type WizardStep = "source" | "url" | "gpx-upload" | "gpx-mode" | "gpx-preview" | "select" | "mode" | "review" | "summary";

interface ImportResult {
  title: string;
  status: "imported" | "skipped" | "error";
  error?: string;
}

const STORAGE_KEY = "route-import-wizard-draft";

interface WizardDraft {
  url: string;
  routes: EditableRoute[];
  selectedIds: string[];
  step: WizardStep;
  reviewIndex: number;
  savedAt: number;
  importSource?: ImportSource;
}

interface GpxFileData {
  file: File;
  metadata: GpxMetadata;
  base64: string;
}

function saveDraft(draft: Omit<WizardDraft, "savedAt">) {
  try {
    const data: WizardDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save draft:", e);
  }
}

function loadDraft(): WizardDraft | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const draft = JSON.parse(data) as WizardDraft;
    // Expire drafts older than 24 hours
    if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return draft;
  } catch (e) {
    console.error("Failed to load draft:", e);
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

export function RouteImportWizard() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [routes, setRoutes] = useState<EditableRoute[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<WizardStep>("source");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [importSource, setImportSource] = useState<ImportSource>("url");
  const [gpxFiles, setGpxFiles] = useState<GpxFileData[]>([]);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });
  const [generatePhotos, setGeneratePhotos] = useState(false);
  const [photoCount, setPhotoCount] = useState(4);
  const [isGeneratingPhotos, setIsGeneratingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ current: 0, total: 0 });

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.step !== "source" && draft.step !== "url" && draft.routes.length > 0) {
      setHasDraft(true);
    }
  }, []);

  // Save draft when state changes (debounced)
  useEffect(() => {
    if ((step === "source" || step === "url" || step === "gpx-upload") && routes.length === 0) return;
    if (importResults.length > 0) return; // Don't save after import complete
    
    const timeout = setTimeout(() => {
      saveDraft({
        url,
        routes,
        selectedIds: Array.from(selectedIds),
        step,
        reviewIndex,
        importSource,
      });
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [url, routes, selectedIds, step, reviewIndex, importResults.length, importSource]);

  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setUrl(draft.url);
      setRoutes(draft.routes);
      setSelectedIds(new Set(draft.selectedIds));
      setStep(draft.step);
      setReviewIndex(draft.reviewIndex);
      setImportSource(draft.importSource || "url");
      setHasDraft(false);
      toast.success("Rozpracovaný import obnoven");
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setHasDraft(false);
  };

  // Get selected routes
  const selectedRoutes = routes.filter((r) => selectedIds.has(r.id));

  // Progress percentage
  const getStepProgress = () => {
    switch (step) {
      case "source":
        return 0;
      case "url":
      case "gpx-upload":
        return 10;
      case "gpx-mode":
        return 20;
      case "gpx-preview":
        return 40;
      case "select":
        return 30;
      case "mode":
        return 45;
      case "review":
        return 45 + (reviewIndex / selectedRoutes.length) * 40;
      case "summary":
        return 100;
      default:
        return 0;
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error("Zadejte URL stránky s trasami");
      return;
    }

    setIsAnalyzing(true);
    setRoutes([]);
    setSelectedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-routes-page",
        {
          body: { url: url.trim() },
        }
      );

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Analýza selhala");
      }

      if (data.routes.length === 0) {
        toast.warning("Na stránce nebyly nalezeny žádné trasy");
        setIsAnalyzing(false);
        return;
      }

      const parsedRoutes: EditableRoute[] = data.routes.map((r: any) => ({
        ...r,
        difficulty: undefined,
        terrain_type: undefined,
      }));

      setRoutes(parsedRoutes);
      // Pre-select all routes with accessible GPX
      const accessibleIds = new Set<string>(
        parsedRoutes
          .filter((r) => r.gpx_accessible || r.gpx_url)
          .map((r) => r.id)
      );
      setSelectedIds(accessibleIds);
      setStep("select");
      toast.success(`Nalezeno ${data.routes.length} tras`);
    } catch (error: any) {
      console.error("Error analyzing URL:", error);
      toast.error(error.message || "Nepodařilo se analyzovat stránku");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGpxFilesSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newGpxFiles: GpxFileData[] = [];
    
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".gpx")) {
        toast.error(`Soubor "${file.name}" není GPX soubor`);
        continue;
      }
      
      try {
        const metadata = await parseGpxMetadata(file);
        if (!metadata) {
          toast.error(`Nepodařilo se načíst "${file.name}"`);
          continue;
        }
        
        const base64 = await readFileAsBase64(file);
        newGpxFiles.push({ file, metadata, base64 });
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error);
        toast.error(`Chyba při zpracování "${file.name}"`);
      }
    }
    
    if (newGpxFiles.length > 0) {
      setGpxFiles(prev => [...prev, ...newGpxFiles]);
      toast.success(`Nahráno ${newGpxFiles.length} GPX souborů`);
    }
  };

  const handleRemoveGpxFile = (index: number) => {
    setGpxFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGpxModeSelect = async (mode: GpxImportMode) => {
    // Convert GPX files to routes
    const newRoutes: EditableRoute[] = gpxFiles.map((gpxData, index) => {
      const difficulty = calculateDifficulty(gpxData.metadata.distanceKm, gpxData.metadata.elevationM);
      const coverUrl = gpxData.metadata.bounds 
        ? generateStaticMapUrl(gpxData.metadata.bounds, gpxData.metadata.startPoint || undefined, gpxData.metadata.endPoint || undefined)
        : undefined;
      
      return {
        id: `gpx-${Date.now()}-${index}`,
        title: gpxData.metadata.name || gpxData.file.name.replace(/\.gpx$/i, ""),
        description: gpxData.metadata.description || "",
        distance_km: gpxData.metadata.distanceKm,
        elevation_m: gpxData.metadata.elevationM,
        gpx_url: undefined,
        gpx_accessible: false,
        cover_url: coverUrl,
        route_link: undefined,
        manualGpxFile: gpxData.file,
        manualGpxBase64: gpxData.base64,
        difficulty: mode === "manual" ? undefined : difficulty,
        terrain_type: undefined,
        generated_images: undefined,
      };
    });
    
    if (mode === "auto") {
      // Generate AI metadata
      setIsGeneratingAI(true);
      setAiProgress({ current: 0, total: newRoutes.length });
      
      try {
        const routeDataForAI = gpxFiles.map(gpxData => ({
          name: gpxData.metadata.name,
          distanceKm: gpxData.metadata.distanceKm,
          elevationM: gpxData.metadata.elevationM,
          startLat: gpxData.metadata.startPoint?.lat,
          startLon: gpxData.metadata.startPoint?.lon,
          endLat: gpxData.metadata.endPoint?.lat,
          endLon: gpxData.metadata.endPoint?.lon,
          maxElevation: gpxData.metadata.maxElevation || undefined,
          minElevation: gpxData.metadata.minElevation || undefined,
          avgGradient: gpxData.metadata.avgGradient || undefined,
        }));
        
        const { data, error } = await supabase.functions.invoke(
          "generate-route-metadata",
          { 
            body: { 
              routes: routeDataForAI,
              generateImages: generatePhotos,
              imageCount: photoCount
            } 
          }
        );
        
        if (error) throw error;
        
        if (data.success && data.results) {
          // Update routes with AI-generated metadata
          data.results.forEach((result: any, index: number) => {
            if (newRoutes[index]) {
              newRoutes[index].title = result.name || newRoutes[index].title;
              newRoutes[index].description = result.description || "";
              newRoutes[index].terrain_type = result.terrainType;
              newRoutes[index].difficulty = calculateDifficulty(
                newRoutes[index].distance_km || 0,
                newRoutes[index].elevation_m || 0
              );
              // Store generated images if any
              if (result.images && result.images.length > 0) {
                newRoutes[index].generated_images = result.images;
              }
            }
            setAiProgress({ current: index + 1, total: newRoutes.length });
          });
          
          const imageCount = newRoutes.reduce((acc, r) => acc + (r.generated_images?.length || 0), 0);
          if (imageCount > 0) {
            toast.success(`AI vygenerovala metadata a ${imageCount} fotografií`);
          } else {
            toast.success("AI vygenerovala metadata pro trasy");
          }
        }
      } catch (error: any) {
        console.error("AI generation error:", error);
        toast.error("AI generování selhalo, použity základní údaje");
      } finally {
        setIsGeneratingAI(false);
      }
    }
    
    setRoutes(newRoutes);
    setSelectedIds(new Set(newRoutes.map(r => r.id)));
    
    if (mode === "auto") {
      setStep("gpx-preview");
    } else {
      setReviewIndex(0);
      setStep("review");
    }
  };

  const handleFileUpload = async (routeId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? { ...r, manualGpxFile: file, manualGpxBase64: base64 }
            : r
        )
      );
      setSelectedIds((prev) => new Set([...prev, routeId]));
      toast.success(`GPX soubor "${file.name}" nahrán`);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => setSelectedIds(new Set(routes.map((r) => r.id)));
  const handleDeselectAll = () => setSelectedIds(new Set());

  const handleModeSelect = (mode: "quick" | "review") => {
    if (mode === "quick") {
      setStep("summary");
    } else {
      setReviewIndex(0);
      setStep("review");
    }
  };

  const handleRouteUpdate = (updated: EditableRoute) => {
    setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleReviewNext = () => {
    if (reviewIndex < selectedRoutes.length - 1) {
      setReviewIndex((i) => i + 1);
    } else {
      setStep("summary");
    }
  };

  const handleReviewPrevious = () => {
    if (reviewIndex > 0) {
      setReviewIndex((i) => i - 1);
    }
  };

  const handleReviewSkip = () => {
    handleReviewNext();
  };

  const handleImport = async () => {
    if (selectedRoutes.length === 0) {
      toast.error("Vyberte alespoň jednu trasu k importu");
      return;
    }

    setIsImporting(true);

    try {
      const routesToImport = selectedRoutes.map((r) => ({
        title: r.title,
        description: r.description,
        distance_km: r.distance_km,
        elevation_m: r.elevation_m,
        gpx_url: r.gpx_accessible ? r.gpx_url : undefined,
        gpx_base64: r.manualGpxBase64,
        gpx_filename: r.manualGpxFile?.name,
        cover_url: r.cover_url,
        route_link: r.route_link,
        difficulty: r.difficulty,
        terrain_type: r.terrain_type,
        generated_images: r.generated_images,
      }));

      const { data, error } = await supabase.functions.invoke(
        "import-selected-routes",
        {
          body: { routes: routesToImport },
        }
      );

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Import selhal");
      }

      setImportResults(data.results || []);
      clearDraft();
      
      const imageInfo = data.totalImagesUploaded > 0 
        ? `, ${data.totalImagesUploaded} fotek nahráno` 
        : "";
      toast.success(`Import dokončen: ${data.imported} tras importováno${imageInfo}`);
    } catch (error: any) {
      console.error("Error importing routes:", error);
      toast.error(error.message || "Nepodařilo se importovat trasy");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setRoutes([]);
    setSelectedIds(new Set());
    setStep("source");
    setReviewIndex(0);
    setImportResults([]);
    setGpxFiles([]);
    setImportSource("url");
    clearDraft();
  };

  const getGpxStatusIcon = (route: EditableRoute) => {
    if (route.manualGpxFile) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (route.gpx_accessible) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (route.gpx_url) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const routesWithoutGpx = routes.filter(
    (r) => !r.gpx_accessible && !r.manualGpxFile
  );

  // Calculate average completion score
  const avgCompletion =
    selectedRoutes.length > 0
      ? Math.round(
          selectedRoutes.reduce(
            (acc, r) => acc + calculateCompletionScore(r).score,
            0
          ) / selectedRoutes.length
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="w-5 h-5" />
          Import tras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        {step !== "source" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Postup</span>
              <span className="font-medium">{Math.round(getStepProgress())}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        )}

        {/* Step: Source Selection */}
        {step === "source" && (
          <div className="space-y-6">
            {/* Draft restore banner */}
            {hasDraft && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-primary" />
                  <span className="text-sm">Máte rozpracovaný import</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>
                    Zahodit
                  </Button>
                  <Button size="sm" onClick={handleRestoreDraft}>
                    Obnovit
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Odkud chcete importovat?</h3>
              <p className="text-sm text-muted-foreground">
                Vyberte zdroj tras pro import
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setImportSource("url");
                  setStep("url");
                }}
                className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">Z webové stránky</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Import tras z URL (bicycle.holiday, Mapy.cz, RideWithGPS a další)
                </p>
              </button>

              <button
                onClick={() => {
                  setImportSource("gpx");
                  setStep("gpx-upload");
                }}
                className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">Ze souboru GPX</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nahrát vlastní GPX soubory s možností AI doplnění metadat
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step: URL Input */}
        {step === "url" && (
          <>
            <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto"
                >
                  <span className="text-sm font-medium">
                    Podporované služby ({SUPPORTED_SERVICES.length})
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      servicesOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                  {SUPPORTED_SERVICES.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <service.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {service.url ? (
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm hover:text-primary flex items-center gap-1"
                            >
                              {service.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="font-medium text-sm">
                              {service.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getGpxStatusBadge(service.gpxStatus)}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2">
              <Input
                placeholder="https://bicycle.holiday/cs/trasy-a-vylety/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isAnalyzing}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAnalyze();
                }}
              />
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !url.trim()}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzuji...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyzovat
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-start pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("source")}>
                Zpět
              </Button>
            </div>
          </>
        )}

        {/* Step: GPX Upload */}
        {step === "gpx-upload" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Nahrát GPX soubory</h3>
              <p className="text-sm text-muted-foreground">
                Vyberte jeden nebo více GPX souborů
              </p>
            </div>

            {/* Upload area */}
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Klikněte pro výběr</span> nebo přetáhněte soubory
                </p>
                <p className="text-xs text-muted-foreground">
                  Pouze GPX soubory
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".gpx"
                multiple
                onChange={(e) => handleGpxFilesSelect(e.target.files)}
              />
            </label>

            {/* Uploaded files list */}
            {gpxFiles.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Soubor</th>
                        <th className="p-2 text-right w-20">km</th>
                        <th className="p-2 text-right w-20">m ↑</th>
                        <th className="p-2 w-24">Obtížnost</th>
                        <th className="p-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gpxFiles.map((gpxData, index) => {
                        const difficulty = calculateDifficulty(
                          gpxData.metadata.distanceKm,
                          gpxData.metadata.elevationM
                        );
                        return (
                          <tr key={index} className="border-t">
                            <td className="p-2">
                              <div className="font-medium truncate max-w-[250px]">
                                {gpxData.metadata.name || gpxData.file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {gpxData.file.name}
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              {gpxData.metadata.distanceKm}
                            </td>
                            <td className="p-2 text-right">
                              {gpxData.metadata.elevationM}
                            </td>
                            <td className="p-2">
                              <Badge
                                variant={
                                  difficulty === "easy"
                                    ? "default"
                                    : difficulty === "medium"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {difficulty === "easy"
                                  ? "Lehká"
                                  : difficulty === "medium"
                                  ? "Střední"
                                  : "Těžká"}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGpxFile(index)}
                              >
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("source")}>
                Zpět
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Nahráno: <strong>{gpxFiles.length}</strong> souborů
                </span>
                <Button
                  onClick={() => setStep("gpx-mode")}
                  disabled={gpxFiles.length === 0}
                >
                  Pokračovat
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: GPX Import Mode Selection */}
        {step === "gpx-mode" && !isGeneratingAI && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Jak chcete doplnit údaje?
              </h3>
              <p className="text-sm text-muted-foreground">
                Nahráno {gpxFiles.length} GPX souborů
              </p>
            </div>

            {/* Photo generation option */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="generate-photos"
                  checked={generatePhotos}
                  onCheckedChange={(checked) => setGeneratePhotos(checked === true)}
                />
                <div className="flex-1">
                  <label htmlFor="generate-photos" className="font-medium flex items-center gap-2 cursor-pointer">
                    <ImagePlus className="w-4 h-4 text-primary" />
                    Vygenerovat AI fotografie
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI vygeneruje ilustrační fotky pro každou trasu na základě popisu a lokace
                  </p>
                  {generatePhotos && (
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm">Počet fotek:</span>
                      <div className="flex gap-1">
                        {[3, 4, 5].map((count) => (
                          <Button
                            key={count}
                            variant={photoCount === count ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPhotoCount(count)}
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleGpxModeSelect("auto")}
                className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">Automaticky (AI)</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  AI vygeneruje názvy, popisy a navrhne obtížnost + terén na základě GPX dat
                  {generatePhotos && ` + ${photoCount} fotografií`}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Rychlé a jednoduché</span>
                </div>
              </button>

              <button
                onClick={() => handleGpxModeSelect("manual")}
                className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Pencil className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">Manuálně</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Projít každou trasu jednotlivě a vyplnit vše ručně
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ClipboardCheck className="w-3 h-3 text-primary" />
                  <span>Plná kontrola</span>
                </div>
              </button>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("gpx-upload")}>
                Zpět
              </Button>
            </div>
          </div>
        )}

        {/* AI Generation Progress */}
        {step === "gpx-mode" && isGeneratingAI && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <h3 className="text-lg font-semibold">AI generování...</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Zpracování {aiProgress.current} z {aiProgress.total} tras
              </p>
            </div>

            <Progress
              value={(aiProgress.current / aiProgress.total) * 100}
              className="h-3"
            />

            <div className="space-y-2">
              {gpxFiles.map((gpxData, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  {index < aiProgress.current ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : index === aiProgress.current ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {gpxData.metadata.name || gpxData.file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {gpxData.metadata.distanceKm} km, {gpxData.metadata.elevationM} m ↑
                    </div>
                  </div>
                  {index < aiProgress.current && (
                    <Badge variant="secondary" className="text-xs">
                      Hotovo
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: GPX Preview - AI Generated Data */}
        {step === "gpx-preview" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Náhled vygenerovaných tras</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                AI vygenerovala metadata pro {routes.length} tras. Zkontrolujte a případně upravte.
              </p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {routes.map((route, index) => (
                <div 
                  key={route.id} 
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  <div className="grid md:grid-cols-[200px_1fr] gap-0">
                    {/* Map Preview */}
                    <div className="relative h-[150px] md:h-full bg-muted">
                      {route.cover_url ? (
                        <img 
                          src={route.cover_url} 
                          alt={`Mapa trasy ${route.title}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Map className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          {index + 1}/{routes.length}
                        </Badge>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-semibold text-base line-clamp-1">{route.title}</h4>
                        {route.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {route.description}
                          </p>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-2">
                        {route.distance_km && (
                          <Badge variant="outline" className="gap-1">
                            <Route className="w-3 h-3" />
                            {route.distance_km} km
                          </Badge>
                        )}
                        {route.elevation_m && (
                          <Badge variant="outline" className="gap-1">
                            <Mountain className="w-3 h-3" />
                            {route.elevation_m} m ↑
                          </Badge>
                        )}
                        {route.difficulty && (
                          <Badge
                            variant={
                              route.difficulty === "easy"
                                ? "default"
                                : route.difficulty === "medium"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {route.difficulty === "easy"
                              ? "Lehká"
                              : route.difficulty === "medium"
                              ? "Střední"
                              : "Těžká"}
                          </Badge>
                        )}
                        {route.terrain_type && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {route.terrain_type === "road"
                              ? "Silnice"
                              : route.terrain_type === "gravel"
                              ? "Gravel"
                              : route.terrain_type === "mtb"
                              ? "MTB"
                              : "Mix"}
                          </Badge>
                        )}
                      </div>

                      {/* GPX Status */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>GPX soubor připraven</span>
                      </div>

                      {/* AI Generated Photos Preview */}
                      {route.generated_images && route.generated_images.length > 0 && (
                        <div className="pt-3 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <Camera className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium">
                              AI fotografie ({route.generated_images.length})
                            </span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {route.generated_images.map((img, imgIndex) => (
                              <div
                                key={imgIndex}
                                className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border bg-muted group"
                                title={img.caption}
                              >
                                <img
                                  src={img.base64}
                                  alt={img.caption || `Foto ${imgIndex + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRoutes(prev => prev.map(r => {
                                        if (r.id !== route.id) return r;
                                        const newImages = r.generated_images?.filter((_, i) => i !== imgIndex);
                                        return { ...r, generated_images: newImages?.length ? newImages : undefined };
                                      }));
                                    }}
                                    className="p-1 bg-destructive/80 hover:bg-destructive rounded-full transition-colors"
                                    title="Odstranit fotografii"
                                  >
                                    <XCircle className="w-3 h-3 text-white" />
                                  </button>
                                  <span className="text-[9px] text-white text-center px-1 line-clamp-1">
                                    {img.caption || `Foto ${imgIndex + 1}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("gpx-mode")}>
                Zpět
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewIndex(0);
                    setStep("review");
                  }}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Upravit jednotlivě
                </Button>
                <Button onClick={() => setStep("summary")} className="gap-2">
                  <Download className="w-4 h-4" />
                  Pokračovat k importu
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Route Selection */}
        {step === "select" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Nalezené trasy ({routes.length})
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Vybrat vše
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Zrušit výběr
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 w-10"></th>
                      <th className="p-2 text-left">Název</th>
                      <th className="p-2 text-right w-20">km</th>
                      <th className="p-2 text-right w-20">m</th>
                      <th className="p-2 w-32">GPX</th>
                      <th className="p-2 w-20">Cover</th>
                      <th className="p-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr
                        key={route.id}
                        className={`border-t hover:bg-muted/30 ${
                          selectedIds.has(route.id) ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={selectedIds.has(route.id)}
                            onCheckedChange={() => handleToggleSelect(route.id)}
                          />
                        </td>
                        <td className="p-2">
                          <div
                            className="font-medium truncate max-w-[300px]"
                            title={route.title}
                          >
                            {route.title}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          {route.distance_km ? `${route.distance_km}` : "-"}
                        </td>
                        <td className="p-2 text-right">
                          {route.elevation_m ? `${route.elevation_m}` : "-"}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {getGpxStatusIcon(route)}
                            <span className="text-xs">
                              {route.manualGpxFile
                                ? "Nahráno"
                                : route.gpx_accessible
                                ? "OK"
                                : route.gpx_url
                                ? "Auth"
                                : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          {route.cover_url ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                        </td>
                        <td className="p-2">
                          {!route.gpx_accessible && !route.manualGpxFile && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept=".gpx"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(route.id, file);
                                }}
                              />
                              <Badge
                                variant="outline"
                                className="gap-1 cursor-pointer hover:bg-muted"
                              >
                                <FileUp className="w-3 h-3" />
                                GPX
                              </Badge>
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {routesWithoutGpx.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p>
                  {routesWithoutGpx.length} tras nemá dostupný GPX soubor.
                  Můžete nahrát GPX ručně.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Zrušit
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Vybráno: <strong>{selectedIds.size}</strong> tras
                </span>
                <Button
                  onClick={() => setStep("mode")}
                  disabled={selectedIds.size === 0}
                >
                  Pokračovat
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step: Mode Selection */}
        {step === "mode" && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Jak chcete importovat trasy?
              </h3>
              <p className="text-sm text-muted-foreground">
                Vybráno {selectedIds.size} tras k importu
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => handleModeSelect("quick")}
                className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">Rychlý import</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Importovat trasy ihned bez dalších úprav. Data budou použita
                  tak, jak byla načtena.
                </p>
              </button>

              <button
                onClick={() => handleModeSelect("review")}
                className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ClipboardCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold">S kontrolou</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Projít každou trasu jednotlivě a doplnit chybějící údaje
                  (obtížnost, terén, popis).
                </p>
              </button>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep("select")}>
                Zpět
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && selectedRoutes[reviewIndex] && (
          <RouteReviewCard
            route={selectedRoutes[reviewIndex]}
            currentIndex={reviewIndex}
            totalCount={selectedRoutes.length}
            onUpdate={handleRouteUpdate}
            onNext={handleReviewNext}
            onPrevious={handleReviewPrevious}
            onSkip={handleReviewSkip}
            isFirst={reviewIndex === 0}
            isLast={reviewIndex === selectedRoutes.length - 1}
          />
        )}

        {/* Step: Summary */}
        {step === "summary" && !isImporting && importResults.length === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Souhrn importu ({selectedRoutes.length} tras)
              </h3>
              <p className="text-sm text-muted-foreground">
                Průměrná kompletnost:{" "}
                <span className="font-medium">{avgCompletion}%</span>
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Trasa</th>
                      <th className="p-2 w-16">GPX</th>
                      <th className="p-2 w-16">Cover</th>
                      <th className="p-2 w-16">Params</th>
                      <th className="p-2 w-32">Kompletnost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoutes.map((route) => {
                      const hasGpx =
                        route.gpx_accessible || route.manualGpxBase64;
                      const hasCover = !!route.cover_url;
                      const hasParams =
                        !!route.distance_km && !!route.elevation_m;

                      return (
                        <tr key={route.id} className="border-t">
                          <td className="p-2">
                            <span className="truncate block max-w-[200px]">
                              {route.title}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {hasGpx ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive mx-auto" />
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {hasCover ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {hasParams ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
                            )}
                          </td>
                          <td className="p-2">
                            <RouteCompletionIndicator route={route} size="sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => {
                if (importSource === "gpx") {
                  setStep("gpx-preview");
                } else {
                  setStep("mode");
                }
              }}>
                Zpět k úpravám
              </Button>
              <Button onClick={handleImport} className="gap-2">
                <Download className="w-4 h-4" />
                Importovat vše
              </Button>
            </div>
          </div>
        )}

        {/* Importing state */}
        {isImporting && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Importuji trasy...</p>
          </div>
        )}

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Import dokončen</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResults.filter((r) => r.status === "imported").length}
                </div>
                <div className="text-sm text-muted-foreground">Importováno</div>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResults.filter((r) => r.status === "skipped").length}
                </div>
                <div className="text-sm text-muted-foreground">Přeskočeno</div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-destructive">
                  {importResults.filter((r) => r.status === "error").length}
                </div>
                <div className="text-sm text-muted-foreground">Chyby</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto">
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${
                      result.status === "imported"
                        ? "bg-green-500/5"
                        : result.status === "skipped"
                        ? "bg-yellow-500/5"
                        : "bg-destructive/5"
                    }`}
                  >
                    {result.status === "imported" ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : result.status === "skipped" ? (
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      {result.error && (
                        <div className="text-xs text-muted-foreground">
                          {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center pt-4 border-t">
              <Button onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Nový import
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
