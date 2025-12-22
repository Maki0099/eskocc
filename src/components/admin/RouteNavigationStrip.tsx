import { EditableRoute } from "./RouteReviewCard";
import { calculateCompletionScore } from "./RouteCompletionIndicator";
import { cn } from "@/lib/utils";
import { Route, CheckCircle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface RouteNavigationStripProps {
  routes: EditableRoute[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function RouteNavigationStrip({ routes, currentIndex, onNavigate }: RouteNavigationStripProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        {routes.map((route, index) => {
          const { score } = calculateCompletionScore(route);
          const isActive = index === currentIndex;
          const hasGpx = route.gpx_accessible || route.manualGpxBase64;

          // Determine completion status color
          let statusColor = "bg-destructive"; // No GPX
          if (hasGpx) {
            if (score >= 80) {
              statusColor = "bg-green-500";
            } else if (score >= 50) {
              statusColor = "bg-yellow-500";
            } else {
              statusColor = "bg-orange-500";
            }
          }

          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onNavigate(index)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                isActive 
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {/* Thumbnail or icon */}
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {route.cover_url ? (
                  <img
                    src={route.cover_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement?.classList.add("route-icon-fallback");
                    }}
                  />
                ) : (
                  <Route className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Title and status */}
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <span className={cn(
                  "text-xs font-medium truncate max-w-[100px]",
                  isActive && "text-primary"
                )}>
                  {route.title.length > 15 ? route.title.substring(0, 15) + "..." : route.title}
                </span>
                <div className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", statusColor)} />
                  <span className="text-[10px] text-muted-foreground">
                    {score}%
                  </span>
                </div>
              </div>

              {/* Completion checkmark */}
              {hasGpx && score >= 80 && (
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
