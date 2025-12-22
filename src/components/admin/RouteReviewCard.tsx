import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RouteCompletionIndicator,
  RouteCompletionDetails,
} from "./RouteCompletionIndicator";
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileUp,
  Image,
  MapPin,
  Globe,
  Info,
  ImagePlus,
  MapIcon,
} from "lucide-react";
import { getRouteSourceInfo } from "@/lib/route-source-utils";
import { GpxPreviewMap } from "@/components/map/GpxPreviewMap";
import { parseGpxMetadata, calculateDifficulty } from "@/lib/gpx-utils";
import { toast } from "sonner";
import { Mountain } from "lucide-react";

export interface GeneratedImage {
  base64: string;
  caption: string;
}

export interface ManualImage {
  file: File;
  base64: string;
  caption: string;
}

export interface EditableRoute {
  id: string;
  title: string;
  description?: string;
  distance_km?: number;
  elevation_m?: number;
  gpx_url?: string;
  gpx_accessible: boolean;
  cover_url?: string;
  route_link?: string;
  manualGpxFile?: File;
  manualGpxBase64?: string;
  manualCoverFile?: File;
  manualCoverBase64?: string;
  difficulty?: string;
  terrain_type?: string;
  generated_images?: GeneratedImage[];
  manual_images?: ManualImage[];
  // Elevation stats from GPX
  min_elevation?: number;
  max_elevation?: number;
}

interface RouteReviewCardProps {
  route: EditableRoute;
  currentIndex: number;
  totalCount: number;
  onUpdate: (route: EditableRoute) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function RouteReviewCard({
  route,
  currentIndex,
  totalCount,
  onUpdate,
  onNext,
  onPrevious,
  onSkip,
  isFirst,
  isLast,
}: RouteReviewCardProps) {
  const [localRoute, setLocalRoute] = useState<EditableRoute>(route);

  // Synchronize localRoute when the route prop changes (e.g., after GPX parsing)
  useEffect(() => {
    setLocalRoute(route);
  }, [route]);

  const handleChange = <K extends keyof EditableRoute>(
    key: K,
    value: EditableRoute[K]
  ) => {
    const updated = { ...localRoute, [key]: value };
    setLocalRoute(updated);
    onUpdate(updated);
  };

  const handleGpxUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      // Clean Garmin-related warnings from description after GPX upload
      let cleanedDescription = localRoute.description;
      if (cleanedDescription) {
        const garminPatterns = [
          /Garmin Connect kurz vyžaduje přihlášení\.?\s*/gi,
          /Pro stažení GPX je nutné přihlášení\.?\s*/gi,
          /GPX není přímo dostupný\.?\s*/gi,
          /Ke stažení GPX souboru je nutné přihlášení\.?\s*/gi,
        ];
        garminPatterns.forEach(pattern => {
          cleanedDescription = cleanedDescription?.replace(pattern, '').trim();
        });
      }
      
      // Parse GPX to extract distance, elevation and stats
      let parsedDistance = localRoute.distance_km;
      let parsedElevation = localRoute.elevation_m;
      let parsedDifficulty = localRoute.difficulty;
      let minElevation = localRoute.min_elevation;
      let maxElevation = localRoute.max_elevation;
      
      try {
        const gpxMetadata = await parseGpxMetadata(file);
        if (gpxMetadata) {
          // Only update if values are missing or zero
          if (!parsedDistance || parsedDistance === 0) {
            parsedDistance = gpxMetadata.distanceKm;
          }
          if (!parsedElevation || parsedElevation === 0) {
            parsedElevation = gpxMetadata.elevationM;
          }
          // Auto-calculate difficulty if not set
          if (!parsedDifficulty && gpxMetadata.distanceKm > 0) {
            parsedDifficulty = calculateDifficulty(gpxMetadata.distanceKm, gpxMetadata.elevationM);
          }
          // Set min/max elevation
          if (gpxMetadata.minElevation !== null) {
            minElevation = gpxMetadata.minElevation;
          }
          if (gpxMetadata.maxElevation !== null) {
            maxElevation = gpxMetadata.maxElevation;
          }
          toast.success(`Doplněno z GPX: ${gpxMetadata.distanceKm} km, ${gpxMetadata.elevationM} m převýšení`);
        }
      } catch (e) {
        console.error("Error parsing GPX for stats:", e);
      }
      
      const updated = {
        ...localRoute,
        manualGpxFile: file,
        manualGpxBase64: base64,
        description: cleanedDescription,
        distance_km: parsedDistance,
        elevation_m: parsedElevation,
        difficulty: parsedDifficulty,
        min_elevation: minElevation,
        max_elevation: maxElevation,
      };
      setLocalRoute(updated);
      onUpdate(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = {
        ...localRoute,
        manualCoverFile: file,
        manualCoverBase64: base64,
        cover_url: base64, // Use base64 as preview
      };
      setLocalRoute(updated);
      onUpdate(updated);
    };
    reader.readAsDataURL(file);
  };

  const hasGpx = localRoute.gpx_accessible || localRoute.manualGpxBase64;
  const hasCover = !!(localRoute.cover_url || localRoute.manualCoverBase64);
  const displayCover = localRoute.manualCoverBase64 || localRoute.cover_url;

  return (
    <div className="space-y-6">
      {/* Inline help banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">
          <strong className="text-foreground">GPX je povinný</strong> pro založení trasy. Odkaz na mapu (mapy.cz, Garmin) a náhledový obrázek jsou volitelné doplňky.
        </span>
      </div>

      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {currentIndex + 1} / {totalCount}
          </Badge>
          <RouteCompletionIndicator route={localRoute} />
        </div>
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        {/* Cover preview */}
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center relative group">
            {displayCover ? (
              <img
                src={displayCover}
                alt={localRoute.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="text-center p-4"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-muted-foreground mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><p class="text-xs text-muted-foreground">Náhled nedostupný</p></div>`;
                  }
                }}
              />
            ) : (
              <div className="text-center p-4">
                <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Bez náhledu</p>
              </div>
            )}
            {/* Cover upload overlay */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverUpload(e.target.files?.[0])}
              />
              <div className="text-white text-center">
                <ImagePlus className="w-6 h-6 mx-auto mb-1" />
                <span className="text-xs">{hasCover ? "Změnit" : "Nahrát"}</span>
              </div>
            </label>
          </div>

          {/* Status badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {hasGpx ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span>GPX {hasGpx ? "dostupný" : "chybí"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasCover ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span>Cover {hasCover ? "dostupný" : "chybí"}</span>
            </div>
            {localRoute.route_link && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <a
                  href={localRoute.route_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[150px]"
                >
                  Zdrojová mapa
                </a>
              </div>
            )}
            {/* Elevation stats */}
            {(localRoute.min_elevation !== undefined || localRoute.max_elevation !== undefined) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mountain className="w-4 h-4" />
                <span>
                  {localRoute.min_elevation !== undefined && `${localRoute.min_elevation} m`}
                  {localRoute.min_elevation !== undefined && localRoute.max_elevation !== undefined && " – "}
                  {localRoute.max_elevation !== undefined && `${localRoute.max_elevation} m`}
                </span>
              </div>
            )}
          </div>

          {/* GPX Map Preview */}
          {hasGpx && localRoute.manualGpxBase64 && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium mb-2 text-muted-foreground flex items-center gap-1">
                <MapIcon className="w-3 h-3" />
                Náhled trasy
              </p>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <GpxPreviewMap gpxData={localRoute.manualGpxBase64} compact />
              </div>
            </div>
          )}

          {/* Completion details */}
          <div className="pt-3 border-t">
            <p className="text-xs font-medium mb-2 text-muted-foreground">Kompletnost</p>
            <RouteCompletionDetails route={localRoute} />
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Název trasy *</Label>
            <Input
              id="title"
              value={localRoute.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Název trasy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea
              id="description"
              value={localRoute.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Krátký popis trasy..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Vzdálenost (km)</Label>
              <Input
                id="distance"
                type="number"
                value={localRoute.distance_km || ""}
                onChange={(e) =>
                  handleChange(
                    "distance_km",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elevation">Převýšení (m)</Label>
              <Input
                id="elevation"
                type="number"
                value={localRoute.elevation_m || ""}
                onChange={(e) =>
                  handleChange(
                    "elevation_m",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="820"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Obtížnost</Label>
              <Select
                value={localRoute.difficulty || ""}
                onValueChange={(value) => handleChange("difficulty", value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Lehká</SelectItem>
                  <SelectItem value="medium">Střední</SelectItem>
                  <SelectItem value="hard">Těžká</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="terrain">Terén</Label>
              <Select
                value={localRoute.terrain_type || ""}
                onValueChange={(value) => handleChange("terrain_type", value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="road">Silnice</SelectItem>
                  <SelectItem value="gravel">Gravel</SelectItem>
                  <SelectItem value="mtb">MTB</SelectItem>
                  <SelectItem value="mixed">Kombinovaný</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Route Link (optional) */}
          <div className="space-y-2">
            <Label htmlFor="route_link" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Odkaz na mapu
              <Badge variant="outline" className="text-xs font-normal">volitelné</Badge>
            </Label>
            <Input
              id="route_link"
              value={localRoute.route_link || ""}
              onChange={(e) => handleChange("route_link", e.target.value)}
              placeholder="https://mapy.cz/s/... nebo https://connect.garmin.com/..."
            />
            {localRoute.route_link && (() => {
              const sourceInfo = getRouteSourceInfo(localRoute.route_link);
              if (sourceInfo) {
                return (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <sourceInfo.icon className="w-3 h-3" />
                    <span>Rozpoznáno: {sourceInfo.name}</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* GPX Upload - Required warning */}
          {!hasGpx && (
            <div className="p-4 border-2 border-dashed border-destructive/50 rounded-lg bg-destructive/5">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Nahrát GPX soubor *</p>
                  <p className="text-xs text-muted-foreground">
                    GPX je povinný pro založení trasy
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".gpx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGpxUpload(file);
                    }}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>Vybrat soubor</span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {localRoute.manualGpxFile && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Nahráno: {localRoute.manualGpxFile.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirst}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Předchozí
        </Button>

        <Button variant="ghost" onClick={onSkip} className="gap-2">
          <SkipForward className="w-4 h-4" />
          Přeskočit
        </Button>

        <Button onClick={onNext} className="gap-2">
          {isLast ? "Dokončit" : "Další"}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
