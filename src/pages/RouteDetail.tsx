import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import GpxMap from "@/components/map/GpxMap";
import CreateEventDialog from "@/components/events/CreateEventDialog";
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
import { ArrowLeft, Route, Mountain, Gauge, Download, ExternalLink, Trash2, MapIcon, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/routes";

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
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchRoute = async () => {
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
    };

    fetchRoute();
  }, [id]);

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
      navigate(ROUTES.EVENTS);
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error("Nepodařilo se smazat trasu");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const canEdit = user && (route?.created_by === user.id || isAdmin);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
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
          <div className="max-w-4xl mx-auto text-center py-12">
            <MapIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Trasa nenalezena</h1>
            <p className="text-muted-foreground mb-6">
              Požadovaná trasa neexistuje nebo byla smazána.
            </p>
            <Button asChild>
              <Link to={ROUTES.EVENTS}>Zpět na vyjížďky</Link>
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
      <main className="flex-1">
        {/* Hero Section with Cover Image */}
        {route.cover_image_url && (
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img
              src={route.cover_image_url}
              alt={route.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className={`container mx-auto px-4 ${route.cover_image_url ? "-mt-20 relative z-10" : "pt-24"} pb-12`}>
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => navigate(ROUTES.EVENTS)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět na vyjížďky
            </Button>

            {/* Title and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{route.title}</h1>
                <div className="flex flex-wrap gap-2">
                  {route.terrain_type && (
                    <Badge variant="outline">
                      {TERRAIN_LABELS[route.terrain_type] || route.terrain_type}
                    </Badge>
                  )}
                  {route.difficulty && (
                    <Badge 
                      variant="outline"
                      className={DIFFICULTY_COLORS[route.difficulty] || ""}
                    >
                      <Gauge className="w-3 h-3 mr-1" />
                      {DIFFICULTY_LABELS[route.difficulty] || route.difficulty}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
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
                {route.gpx_file_url && (
                  <Button variant="outline" asChild>
                    <a href={route.gpx_file_url} download>
                      <Download className="w-4 h-4 mr-2" />
                      Stáhnout GPX
                    </a>
                  </Button>
                )}
                {route.route_link && (
                  <Button variant="outline" asChild>
                    <a href={route.route_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Mapy
                    </a>
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Route Stats */}
            {(route.distance_km || route.elevation_m) && (
              <div className="flex gap-6 mb-6">
                {route.distance_km && (
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{route.distance_km} km</p>
                      <p className="text-sm text-muted-foreground">Vzdálenost</p>
                    </div>
                  </div>
                )}
                {route.elevation_m && (
                  <div className="flex items-center gap-2">
                    <Mountain className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{route.elevation_m} m</p>
                      <p className="text-sm text-muted-foreground">Převýšení</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {route.description && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Popis trasy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {route.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* GPX Map */}
            {route.gpx_file_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapIcon className="w-5 h-5" />
                    Mapa trasy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GpxMap gpxUrl={route.gpx_file_url} />
                </CardContent>
              </Card>
            )}
          </div>
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
