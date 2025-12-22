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

// Account Page Skeleton
export function AccountPageSkeleton() {
  return (
    <div className="max-w-md mx-auto">
      <Skeleton className="h-8 w-32 mb-8" />
      
      {/* Avatar section */}
      <div className="flex flex-col items-center mb-8">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-3 w-36 mt-2" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2" style={{ animationDelay: `${i * 50}ms` }}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
        
        {/* Strava section */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="mt-8 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Member Profile Skeleton
export function MemberProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Card */}
      <Card>
        <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
          <Skeleton className="h-24 w-24 rounded-full mb-4" />
          <Skeleton className="h-7 w-48 mb-2" />
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-32 rounded-full mt-3" />
        </CardContent>
      </Card>

      {/* Strava Stats Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6 text-center">
              <Skeleton className="h-9 w-12 mx-auto mb-1" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Participations */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border" style={{ animationDelay: `${i * 75}ms` }}>
              <Skeleton className="h-5 w-48 mb-2" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Event Detail Skeleton
export function EventDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />
      
      {/* Cover Image */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      {/* Title and badges */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>

      {/* Route params badges */}
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>

      {/* Map Card */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex flex-wrap gap-6 pt-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Participants Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Notifications Skeleton
export function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div 
          key={i} 
          className="p-4 rounded-xl border border-border/40"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="flex gap-4">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-3 w-20" />
                <div className="flex gap-1">
                  <Skeleton className="h-7 w-16 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Route Detail Skeleton
export function RouteDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-40" />
      
      {/* Cover Image */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      {/* Title */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>

      {/* Map Card */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-16" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Description Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>

      {/* Photos Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
