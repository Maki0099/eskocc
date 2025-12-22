import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteData {
  title?: string;
  description?: string;
  distance_km?: number;
  elevation_m?: number;
  gpx_url?: string;
  gpx_accessible?: boolean;
  manualGpxBase64?: string;
  cover_url?: string;
  difficulty?: string;
  terrain_type?: string;
}

interface RouteCompletionIndicatorProps {
  route: RouteData;
  showLabel?: boolean;
  size?: "sm" | "md";
}

interface CompletionField {
  name: string;
  weight: number;
  filled: boolean;
  required?: boolean;
}

export function calculateCompletionScore(route: RouteData): {
  score: number;
  fields: CompletionField[];
} {
  const hasGpx = !!(route.gpx_accessible || route.manualGpxBase64 || route.gpx_url);
  
  const fields: CompletionField[] = [
    { name: "Název", weight: 20, filled: !!route.title?.trim(), required: true },
    { name: "GPX", weight: 25, filled: hasGpx, required: true },
    { name: "Vzdálenost", weight: 10, filled: typeof route.distance_km === 'number' && route.distance_km > 0 },
    { name: "Převýšení", weight: 10, filled: typeof route.elevation_m === 'number' && route.elevation_m > 0 },
    { name: "Cover", weight: 15, filled: !!(route.cover_url || (route as any).manualCoverBase64) },
    { name: "Obtížnost", weight: 5, filled: !!route.difficulty },
    { name: "Terén", weight: 5, filled: !!route.terrain_type },
    { name: "Popis", weight: 10, filled: !!route.description?.trim() },
  ];

  const score = fields.reduce((acc, field) => acc + (field.filled ? field.weight : 0), 0);
  
  return { score, fields };
}

export function RouteCompletionIndicator({
  route,
  showLabel = true,
  size = "md",
}: RouteCompletionIndicatorProps) {
  const { score, fields } = calculateCompletionScore(route);
  
  const barCount = 10;
  const filledBars = Math.round((score / 100) * barCount);
  
  const getColor = () => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-destructive";
  };

  const getBgColor = () => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-destructive";
  };

  const getIcon = () => {
    if (score >= 80) return <CheckCircle className={cn("flex-shrink-0", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />;
    if (score >= 50) return <AlertCircle className={cn("flex-shrink-0", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />;
    return <XCircle className={cn("flex-shrink-0", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />;
  };

  return (
    <div className={cn("flex items-center gap-2", getColor())}>
      {getIcon()}
      <div className="flex items-center gap-1">
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-sm",
              size === "sm" ? "w-1.5 h-2" : "w-2 h-3",
              i < filledBars ? getBgColor() : "bg-muted"
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm")}>
          {score}%
        </span>
      )}
    </div>
  );
}

export function RouteCompletionDetails({ route }: { route: RouteData }) {
  const { fields } = calculateCompletionScore(route);

  return (
    <div className="grid grid-cols-2 gap-1 text-xs">
      {fields.map((field) => (
        <div key={field.name} className="flex items-center gap-1">
          {field.filled ? (
            <CheckCircle className="w-3 h-3 text-green-500" />
          ) : field.required ? (
            <XCircle className="w-3 h-3 text-destructive" />
          ) : (
            <AlertCircle className="w-3 h-3 text-muted-foreground" />
          )}
          <span className={cn(field.filled ? "text-foreground" : "text-muted-foreground")}>
            {field.name}
          </span>
        </div>
      ))}
    </div>
  );
}
