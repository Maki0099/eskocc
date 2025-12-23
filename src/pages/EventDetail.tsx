import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EditEventDialog from "@/components/events/EditEventDialog";
import EventNotificationToggle from "@/components/events/EventNotificationToggle";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import PhotoUpload from "@/components/gallery/PhotoUpload";
import GpxMap from "@/components/map/GpxMap";
import StartLocationMap from "@/components/map/StartLocationMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  MapPin, 
  ExternalLink, 
  ArrowLeft, 
  Users, 
  Trash2, 
  ImageIcon,
  Download,
  Route,
  Mountain,
  Gauge,
  Bike,
  Map,
  Heart
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { getInitials } from "@/lib/user-utils";
import { EventDetailSkeleton } from "@/components/skeletons/PageSkeletons";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  route_link: string | null;
  created_by: string | null;
  cover_image_url: string | null;
  gpx_file_url: string | null;
  distance_km: number | null;
  elevation_m: number | null;
  difficulty: string | null;
  terrain_type: string | null;
  strava_event_id: string | null;
  strava_event_url: string | null;
  start_latlng: any;
  sport_type: string | null;
  organizing_athlete_name: string | null;
  women_only: boolean | null;
  source_route_id: string | null;
}

interface LinkedRoute {
  id: string;
  title: string;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

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

const SPORT_TYPE_LABELS: Record<string, string> = {
  Ride: "Silnice",
  GravelRide: "Gravel",
  MountainBikeRide: "MTB",
  VirtualRide: "Virtuální",
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isMember } = useUserRole();
  
  const isPastEvent = (eventDate: string) => new Date(eventDate) < new Date();

  const [event, setEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingToFavorites, setAddingToFavorites] = useState(false);
  const [linkedRoute, setLinkedRoute] = useState<LinkedRoute | null>(null);

  const isCreator = user && event?.created_by === user.id;
  const canEdit = isCreator || isAdmin;

  const fetchEvent = async () => {
    if (!id) return;

    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) {
        navigate("/events");
        return;
      }

      setEvent(eventData);

      // Check if this event was created from a route (source_route_id)
      if (eventData.source_route_id) {
        const { data: sourceRoute } = await supabase
          .from("favorite_routes")
          .select("id, title")
          .eq("id", eventData.source_route_id)
          .maybeSingle();
        if (sourceRoute) {
          setLinkedRoute(sourceRoute);
        }
      } else {
        // Check if a route was created from this event (source_event_id)
        const { data: derivedRoute } = await supabase
          .from("favorite_routes")
          .select("id, title")
          .eq("source_event_id", id)
          .maybeSingle();
        if (derivedRoute) {
          setLinkedRoute(derivedRoute);
        }
      }

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("event_participants")
        .select(`
          id,
          user_id,
          status,
          profile:profiles(full_name, avatar_url)
        `)
        .eq("event_id", id)
        .eq("status", "going");

      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);

      // Check if current user is participating
      if (user) {
        const userParticipation = participantsData?.find(
          (p) => p.user_id === user.id
        );
        setIsParticipating(!!userParticipation);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Nepodařilo se načíst vyjížďku");
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select(`
          *,
          profile:profiles(full_name)
        `)
        .eq("event_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    }
  };

  useEffect(() => {
    fetchEvent();
    fetchPhotos();
  }, [id, user]);

  const handleJoin = async () => {
    if (!user || !id) {
      toast.error("Pro přihlášení se musíte přihlásit");
      return;
    }

    try {
      const { error } = await supabase.from("event_participants").insert({
        event_id: id,
        user_id: user.id,
        status: "going",
      });

      if (error) throw error;

      toast.success("Úspěšně přihlášeno na vyjížďku");
      fetchEvent();
    } catch (error: any) {
      console.error("Error joining event:", error);
      toast.error(error.message || "Nepodařilo se přihlásit");
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Odhlášeno z vyjížďky");
      fetchEvent();
    } catch (error: any) {
      console.error("Error leaving event:", error);
      toast.error("Nepodařilo se odhlásit");
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) throw error;

      toast.success("Vyjížďka byla smazána");
      navigate("/events");
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Nepodařilo se smazat vyjížďku");
    }
  };

  const handleAddToFavorites = async () => {
    if (!event || !user) return;

    setAddingToFavorites(true);
    try {
      // Check if a route from this event already exists
      const { data: existingRoute } = await supabase
        .from("favorite_routes")
        .select("id")
        .eq("source_event_id", event.id)
        .maybeSingle();

      if (existingRoute) {
        toast.error("Tato trasa už je v oblíbených", {
          action: {
            label: "Zobrazit",
            onClick: () => navigate(`/routes/${existingRoute.id}`),
          },
        });
        return;
      }

      const { error } = await supabase.from("favorite_routes").insert({
        title: event.title,
        description: event.description,
        distance_km: event.distance_km,
        elevation_m: event.elevation_m,
        difficulty: event.difficulty,
        terrain_type: event.terrain_type,
        route_link: event.route_link,
        gpx_file_url: event.gpx_file_url,
        cover_image_url: event.cover_image_url,
        created_by: user.id,
        source_event_id: event.id,
      });

      if (error) throw error;

      toast.success("Trasa přidána do oblíbených", {
        action: {
          label: "Zobrazit",
          onClick: () => navigate("/events?tab=routes"),
        },
      });
    } catch (error: any) {
      console.error("Error adding to favorites:", error);
      toast.error("Nepodařilo se přidat trasu do oblíbených");
    } finally {
      setAddingToFavorites(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <EventDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const hasRouteParams = event.distance_km || event.elevation_m || event.difficulty || event.terrain_type;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zpět na vyjížďky
            </Link>
          </div>

          {/* Cover Image */}
          {event.cover_image_url && (
            <div className="relative rounded-xl overflow-hidden mb-6 aspect-[21/9]">
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4 mb-6" data-tour="event-title">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{event.title}</h1>
              {/* Badge for events imported from Strava */}
              {event.strava_event_id && (
                <Badge variant="outline" className="gap-1 text-[#FC4C02] border-[#FC4C02]/30">
                  Ze Strava
                </Badge>
              )}
              {event.sport_type && SPORT_TYPE_LABELS[event.sport_type] && (
                <Badge variant="secondary">
                  {SPORT_TYPE_LABELS[event.sport_type]}
                </Badge>
              )}
              {event.women_only && (
                <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20">
                  Pouze ženy
                </Badge>
              )}
              {isPastEvent(event.event_date) && (
                <Badge variant="outline" className="text-muted-foreground">
                  Proběhlo
                </Badge>
              )}
              {user && !isPastEvent(event.event_date) && (
                <EventNotificationToggle eventId={id!} userId={user.id} />
              )}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <EditEventDialog event={event} onEventUpdated={fetchEvent} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Smazat vyjížďku?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tato akce je nevratná. Vyjížďka a všechny přihlášky budou
                        trvale odstraněny.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Zrušit</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Smazat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Route Parameters Badges */}
          {hasRouteParams && (
            <div className="flex flex-wrap gap-2 mb-6">
              {event.distance_km && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Route className="w-3.5 h-3.5" />
                  {event.distance_km} km
                </Badge>
              )}
              {event.elevation_m && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Mountain className="w-3.5 h-3.5" />
                  {event.elevation_m} m
                </Badge>
              )}
              {event.difficulty && (
                <Badge 
                  variant="outline" 
                  className={`gap-1.5 py-1.5 px-3 ${DIFFICULTY_COLORS[event.difficulty] || ""}`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  {DIFFICULTY_LABELS[event.difficulty] || event.difficulty}
                </Badge>
              )}
              {event.terrain_type && (
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <Bike className="w-3.5 h-3.5" />
                  {TERRAIN_LABELS[event.terrain_type] || event.terrain_type}
                </Badge>
              )}
            </div>
          )}

          {/* GPX Map or Start Location Map */}
          {event.gpx_file_url ? (
            <Card className="mb-6" data-tour="event-map">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Map className="w-5 h-5" />
                  Trasa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GpxMap gpxUrl={event.gpx_file_url} />
              </CardContent>
            </Card>
          ) : event.start_latlng && (
            <Card className="mb-6" data-tour="event-map">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5" />
                  Místo startu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StartLocationMap coordinates={event.start_latlng} />
              </CardContent>
            </Card>
          )}

          <Card className="mb-6" data-tour="event-info">
            <CardContent className="pt-6 space-y-4">
              {event.description && (
                <p className="text-muted-foreground">{event.description}</p>
              )}

              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(event.event_date), "EEEE d. MMMM yyyy, HH:mm", {
                      locale: cs,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
                {event.organizing_athlete_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Organizuje: {event.organizing_athlete_name}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                {/* Strava event link */}
                {event.strava_event_url && (
                  <Button variant="outline" className="gap-2 border-[#FC4C02]/30 text-[#FC4C02] hover:bg-[#FC4C02]/10" asChild>
                    <a
                      href={event.strava_event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.172" />
                      </svg>
                      Zobrazit na Stravě
                    </a>
                  </Button>
                )}

                {event.route_link && (
                  <Button variant="outline" asChild>
                    <a
                      href={event.route_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Zobrazit trasu
                    </a>
                  </Button>
                )}

                {event.gpx_file_url && (
                  <>
                    <Button variant="outline" asChild>
                      <a
                        href={event.gpx_file_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Stáhnout GPX
                      </a>
                    </Button>
                    {user && isMember && !linkedRoute && (
                      <Button
                        variant="outline"
                        onClick={handleAddToFavorites}
                        disabled={addingToFavorites}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        {addingToFavorites ? "Ukládám..." : "Do oblíbených"}
                      </Button>
                    )}
                    {linkedRoute && (
                      <Button variant="outline" asChild>
                        <Link to={`/routes/${linkedRoute.id}`}>
                          <Route className="w-4 h-4 mr-2" />
                          Oblíbená trasa
                        </Link>
                      </Button>
                    )}
                  </>
                )}

                {user && !isPastEvent(event.event_date) &&
                  (isParticipating ? (
                    <Button variant="outline" onClick={handleLeave}>
                      Odhlásit se
                    </Button>
                  ) : (
                    <Button onClick={handleJoin}>Přihlásit se</Button>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card data-tour="event-participants">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Účastníci ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Zatím žádní účastníci
                </p>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <Link
                      key={participant.id}
                      to={`/member/${participant.user_id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-9 w-9">
                        {participant.profile?.avatar_url && (
                          <AvatarImage 
                            src={participant.profile.avatar_url} 
                            alt={participant.profile?.full_name || "Účastník"} 
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            participant.profile?.full_name || null,
                            "U"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {participant.profile?.full_name || "Člen klubu"}
                        </p>
                      </div>
                      <Badge variant="secondary">Jede</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gallery Section */}
          <Card className="mt-6" data-tour="event-photos">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5" />
                  Fotky ({photos.length})
                </CardTitle>
                {user && isMember && (
                  <PhotoUpload eventId={id} onUploadComplete={fetchPhotos} />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <PhotoGrid photos={photos} onPhotoDeleted={fetchPhotos} />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
