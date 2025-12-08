import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonClubGoal() {
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="bg-gradient-to-br from-accent to-secondary p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-12 h-12 rounded-full bg-accent-foreground/20" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-accent-foreground/20" />
            <Skeleton className="h-4 w-48 bg-accent-foreground/15" />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-12 w-40 bg-accent-foreground/20" />
            <Skeleton className="h-5 w-28 bg-accent-foreground/15" />
          </div>
          
          <Skeleton className="h-3 w-full rounded-full bg-accent-foreground/20" />
          
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24 bg-accent-foreground/15" />
            <Skeleton className="h-4 w-32 bg-accent-foreground/15" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SkeletonAgeCategories() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="text-center">
          <CardContent className="pt-6 pb-5">
            <Skeleton className="w-10 h-10 rounded-full mx-auto mb-3" />
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-7 w-28 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonLeaderboard({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, index) => (
            <div 
              key={index}
              className="p-3 md:p-4 rounded-xl bg-card"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 md:gap-4">
                {/* Rank */}
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />

                {/* Avatar */}
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                
                {/* Name & Category */}
                <div className="min-w-0 flex-shrink-0 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>

                {/* Progress - Desktop */}
                <div className="flex-1 hidden md:block ml-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>

                {/* Stats - Desktop */}
                <div className="hidden md:flex items-center gap-4 flex-shrink-0 ml-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>

              {/* Mobile Progress */}
              <div className="md:hidden mt-3 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatisticsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonClubGoal />
      <SkeletonAgeCategories />
      <SkeletonLeaderboard rows={8} />
    </div>
  );
}
