import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import GpxMap from "@/components/map/GpxMap";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import EditRouteDialog from "@/components/routes/EditRouteDialog";
import PhotoUpload from "@/components/gallery/PhotoUpload";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Route, Mountain, Gauge, Download, ExternalLink, Trash2, MapIcon, CalendarPlus, Bike, Map, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";

interface Photo {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
  } | null;
}

interface FavoriteRoute {
  id: string;
  title: string;
  description: string | null;
  distance_km: number | null;
  elevation_m: number | null;
  difficulty: string | null;
  terrain_type: string | null;
  route_link: string | null;
  gpx_file_url: string | null;
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Lehká",
  medium: "Střední",
  hard: "Náročná",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-600 border-red-500/20",
};

const TERRAIN_LABELS: Record<string, string> = {
  road: "Silnice",
  gravel: "Gravel",
  mtb: "MTB",
  mixed: "Mix",
};

const RouteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMember, isAdmin, canCreateEvents, loading: roleLoading } = useUserRole();
  const [route, setRoute] = useState<FavoriteRoute | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRoute = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("favorite_routes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setRoute(data);
    } catch (error) {
      console.error("Error fetching route:", error);
      toast.error("Nepodařilo se načíst trasu");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select(`*, profile:profiles(full_name)`)
        .eq("route_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchRoute();
    fetchPhotos();
  }, [fetchRoute, fetchPhotos]);

  const handleDelete = async () => {
    if (!route) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("favorite_routes")
        .delete()
        .eq("id", route.id);

      if (error) throw error;

      toast.success("Trasa byla smazána");
      navigate("/events?tab=routes");
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error("Nepodařilo se smazat trasu");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const canEdit = user && (route?.created_by === user.id || isAdmin);
  const hasRouteParams = route?.distance_km || route?.elevation_m || route?.difficulty || route?.terrain_type;

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <MemberOnlyContent
            title="Detail trasy pro členy"
            description="Pro zobrazení detailu trasy se staň členem klubu."
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-3xl mx-auto text-center py-12">
            <MapIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Trasa nenalezena</h1>
            <p className="text-muted-foreground mb-6">
              Požadovaná trasa neexistuje nebo byla smazána.
            </p>
            <Button asChild>
              <Link to="/events?tab=routes">Zpět na oblíbené trasy</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link
            to="/events?tab=routes"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět na oblíbené trasy
          </Link>

          {/* Cover Image */}
          {route.cover_image_url && (
            <div className="relative rounded-xl overflow-hidden mb-6 aspect-[21/9]">
              <img
                src={route.cover_image_url}
                alt={route.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          {/* Title and Actions */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">{route.title}</h1>
            {canEdit && (
              <div className="flex gap-2">
                <EditRouteDialog route={route} onRouteUpdated={fetchRoute} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Route Parameters Badges */}
          {hasRouteParams && (
            <div className="flex flex-wrap gap-2 mb-6">
              {route.distance_km && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Route className="w-3.5 h-3.5" />
                  {route.distance_km} km
                </Badge>
              )}
              {route.elevation_m && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Mountain className="w-3.5 h-3.5" />
                  {route.elevation_m} m
                </Badge>
              )}
              {route.difficulty && (
                <Badge 
                  variant="outline" 
                  className={`gap-1.5 py-1.5 px-3 ${DIFFICULTY_COLORS[route.difficulty] || ""}`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  {DIFFICULTY_LABELS[route.difficulty] || route.difficulty}
                </Badge>
              )}
              {route.terrain_type && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Bike className="w-3.5 h-3.5" />
                  {TERRAIN_LABELS[route.terrain_type] || route.terrain_type}
                </Badge>
              )}
            </div>
          )}

          {/* GPX Map */}
          {route.gpx_file_url && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Map className="w-5 h-5" />
                  Trasa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GpxMap gpxUrl={route.gpx_file_url} />
              </CardContent>
            </Card>
          )}

          {/* Description and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              {route.description && (
                <p className="text-muted-foreground whitespace-pre-wrap">{route.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                {route.gpx_file_url && (
                  <Button variant="outline" asChild>
                    <a href={route.gpx_file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Stáhnout GPX
                    </a>
                  </Button>
                )}
                {route.route_link && (
                  <Button variant="outline" asChild>
                    <a href={route.route_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Zobrazit trasu
                    </a>
                  </Button>
                )}
                {canCreateEvents && (
                  <CreateEventDialog
                    onEventCreated={() => navigate(ROUTES.EVENTS)}
                    initialData={{
                      title: route.title,
                      description: route.description,
                      distance_km: route.distance_km,
                      elevation_m: route.elevation_m,
                      difficulty: route.difficulty,
                      terrain_type: route.terrain_type,
                      route_link: route.route_link,
                      gpx_file_url: route.gpx_file_url,
                      cover_image_url: route.cover_image_url,
                    }}
                    customTrigger={
                      <Button className="gap-2">
                        <CalendarPlus className="w-4 h-4" />
                        Vytvořit vyjížďku
                      </Button>
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photos Section */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5" />
                  Fotky ({photos.length})
                </CardTitle>
                {user && isMember && (
                  <PhotoUpload routeId={route.id} onUploadComplete={fetchPhotos} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <PhotoGrid photos={photos} onPhotoDeleted={fetchPhotos} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Zatím žádné fotky. Buď první, kdo přidá fotku z této trasy!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trasu?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat trasu "{route.title}"? Tuto akci nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Mazání..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RouteDetail;
