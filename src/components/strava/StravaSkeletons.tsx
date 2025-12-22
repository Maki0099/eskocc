import { Skeleton } from "@/components/ui/skeleton";
import stravaLogo from "@/assets/strava-logo.svg";

export function StravaWidgetSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={stravaLogo} 
            alt="Strava" 
            className="h-5 w-auto opacity-50 animate-pulse"
          />
          <Skeleton className="h-3 w-20 bg-orange-500/10" />
        </div>
        <Skeleton className="h-6 w-6 rounded-lg bg-orange-500/10" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className="text-center"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Skeleton className="w-4 h-4 mx-auto mb-1 rounded bg-orange-500/20" />
            <Skeleton className="h-6 w-12 mx-auto mb-1 bg-muted/40" />
            <Skeleton className="h-3 w-10 mx-auto bg-muted/20" />
          </div>
        ))}
      </div>
      
      {/* Chart area */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-40 bg-muted/30" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-8 rounded bg-muted/30" />
            <Skeleton className="h-5 w-10 rounded bg-muted/30" />
          </div>
        </div>
        <div className="h-24 flex items-end gap-1">
          {[40, 60, 35, 80, 55, 70, 45, 90, 65, 50, 75, 85].map((h, i) => (
            <Skeleton 
              key={i} 
              className="flex-1 bg-orange-500/20 rounded-t"
              style={{ 
                height: `${h}%`,
                animationDelay: `${i * 75}ms`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-36 bg-muted/40" />
          <Skeleton className="h-3 w-24 bg-orange-500/10" />
        </div>
      </div>
    </div>
  );
}

export function StravaStatsSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <img 
          src={stravaLogo} 
          alt="Strava" 
          className="h-4 w-auto opacity-50 animate-pulse"
        />
        <Skeleton className="h-4 w-28 bg-muted/40" />
      </div>
      
      {/* All-time stats card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
        <Skeleton className="h-3 w-12 mb-3 bg-muted/40" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="flex items-center gap-2"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Skeleton className="w-8 h-8 rounded-lg bg-orange-500/20" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-14 bg-muted/40" />
                <Skeleton className="h-3 w-12 bg-muted/20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* YTD stats card */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
        <Skeleton className="h-3 w-16 mb-3 bg-muted/40" />
        <div className="flex items-center justify-between">
          {[0, 1, 2].map((i) => (
            <div 
              key={i} 
              className="flex items-center gap-2"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Skeleton className="w-4 h-4 rounded bg-muted/30" />
              <Skeleton className="h-4 w-16 bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
