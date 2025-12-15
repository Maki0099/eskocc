import { useState } from "react";
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
} from "lucide-react";

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
  difficulty?: string;
  terrain_type?: string;
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

  const handleChange = <K extends keyof EditableRoute>(
    key: K,
    value: EditableRoute[K]
  ) => {
    const updated = { ...localRoute, [key]: value };
    setLocalRoute(updated);
    onUpdate(updated);
  };

  const handleGpxUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = {
        ...localRoute,
        manualGpxFile: file,
        manualGpxBase64: base64,
      };
      setLocalRoute(updated);
      onUpdate(updated);
    };
    reader.readAsDataURL(file);
  };

  const hasGpx = localRoute.gpx_accessible || localRoute.manualGpxBase64;
  const hasCover = !!localRoute.cover_url;

  return (
    <div className="space-y-6">
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
          <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {localRoute.cover_url ? (
              <img
                src={localRoute.cover_url}
                alt={localRoute.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="text-center p-4">
                <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Bez náhledu</p>
              </div>
            )}
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
          </div>

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

          {/* GPX Upload */}
          {!hasGpx && (
            <div className="p-4 border border-dashed rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <FileUp className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Nahrát GPX soubor</p>
                  <p className="text-xs text-muted-foreground">
                    GPX není automaticky dostupný, nahrajte jej ručně
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
