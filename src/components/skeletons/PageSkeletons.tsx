import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteListItemSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div 
      className="flex items-center justify-between p-4 rounded-lg border bg-card"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Terrain Icon */}
        <Skeleton className="w-6 h-6 rounded shrink-0" />

        {/* Title and Source Icon */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="w-4 h-4 rounded shrink-0" />
        </div>

        {/* Stats - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>

        {/* Difficulty Badge - hidden on mobile */}
        <Skeleton className="hidden md:block h-5 w-16 rounded-full shrink-0" />
      </div>

      {/* Actions Button */}
      <Skeleton className="h-8 w-8 rounded shrink-0" />
    </div>
  );
}

export function RouteListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <RouteListItemSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

export function GalleryAlbumSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div 
      className="rounded-lg overflow-hidden border border-border bg-card"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="w-4 h-4 rounded" />
      </div>
    </div>
  );
}

export function GalleryPageSkeleton() {
  return (
    <div className="space-y-12">
      {/* Albums Section */}
      <div>
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GalleryAlbumSkeleton key={i} index={i} />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        
        {/* Photo grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square rounded-lg"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card 
      className="overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Cover image skeleton */}
      <Skeleton className="h-32 w-full" />
      
      <CardHeader className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full shrink-0" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EventsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
