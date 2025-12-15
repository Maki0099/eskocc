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
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RouteReviewCard, EditableRoute } from "./RouteReviewCard";
import {
  RouteCompletionIndicator,
  calculateCompletionScore,
} from "./RouteCompletionIndicator";

type GpxStatus = "available" | "auth-required" | "premium" | "varies" | "detection";

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

type WizardStep = "url" | "select" | "mode" | "review" | "summary";

interface ImportResult {
  title: string;
  success: boolean;
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
  const [routes, setRoutes] = useState<EditableRoute[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<WizardStep>("url");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.step !== "url" && draft.routes.length > 0) {
      setHasDraft(true);
    }
  }, []);

  // Save draft when state changes (debounced)
  useEffect(() => {
    if (step === "url" && routes.length === 0) return;
    if (importResults.length > 0) return; // Don't save after import complete
    
    const timeout = setTimeout(() => {
      saveDraft({
        url,
        routes,
        selectedIds: Array.from(selectedIds),
        step,
        reviewIndex,
      });
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [url, routes, selectedIds, step, reviewIndex, importResults.length]);

  const handleRestoreDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setUrl(draft.url);
      setRoutes(draft.routes);
      setSelectedIds(new Set(draft.selectedIds));
      setStep(draft.step);
      setReviewIndex(draft.reviewIndex);
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
      case "url":
        return 0;
      case "select":
        return 25;
      case "mode":
        return 40;
      case "review":
        return 40 + (reviewIndex / selectedRoutes.length) * 40;
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
      toast.success(`Import dokončen: ${data.imported} tras importováno`);
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
    setStep("url");
    setReviewIndex(0);
    setImportResults([]);
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
        {step !== "url" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Postup</span>
              <span className="font-medium">{Math.round(getStepProgress())}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>
        )}

        {/* Step: URL Input */}
        {step === "url" && (
          <>
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
          </>
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
              <Button variant="outline" onClick={() => setStep("mode")}>
                Zpět k úpravám
              </Button>
              <Button onClick={handleImport} className="gap-2">
                <Download className="w-4 h-4" />
                Importovat vše
              </Button>
            </div>
          </div>
        )}

        {/* Importing State */}
        {isImporting && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Importuji {selectedRoutes.length} tras...
            </p>
          </div>
        )}

        {/* Complete State */}
        {importResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Import dokončen</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResults.filter((r) => r.success).length}
                </div>
                <div className="text-sm text-muted-foreground">Importováno</div>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {
                    importResults.filter(
                      (r) => !r.success && r.error?.includes("existuje")
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">Přeskočeno</div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-destructive">
                  {
                    importResults.filter(
                      (r) => !r.success && !r.error?.includes("existuje")
                    ).length
                  }
                </div>
                <div className="text-sm text-muted-foreground">Chyby</div>
              </div>
            </div>

            <Button onClick={handleReset} className="w-full">
              Nový import
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
