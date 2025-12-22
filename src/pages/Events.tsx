import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import CreateRouteDialog from "@/components/routes/CreateRouteDialog";
import EditRouteDialog from "@/components/routes/EditRouteDialog";
import RouteListItem from "@/components/routes/RouteListItem";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import EventParticipationToggle from "@/components/events/EventParticipationToggle";
import StravaEventBadge from "@/components/events/StravaEventBadge";
import ImportStravaEventDialog from "@/components/events/ImportStravaEventDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonEventCard } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { Calendar, MapPin, Users, ChevronRight, Camera, History, Loader2, Route, Mountain, Gauge, Heart, MapIcon, RefreshCw, ExternalLink } from "lucide-react";
import { format, isSameMonth, isSameYear } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  route_link: string | null;
  participant_count: number;
  is_participating: boolean;
  photo_count?: number;
  cover_image_url?: string | null;
  distance_km?: number | null;
  elevation_m?: number | null;
  difficulty?: string | null;
  terrain_type?: string | null;
  is_strava_event?: boolean;
  strava_event_id?: string;
  strava_event_url?: string | null;
  organizing_athlete_name?: string | null;
}

interface StravaClubEvent {
  id: string;
  strava_event_id: string;
  title: string;
  description: string | null;
  event_date: string;
  address: string | null;
  sport_type: string | null;
  organizing_athlete_name: string | null;
  participant_count: number;
  start_latlng?: any;
  skill_level?: number | null;
  terrain?: number | null;
  route_polyline?: string | null;
  strava_route_id?: string | null;
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
}

interface GroupedEvents {
  label: string;
  date: Date;
  events: Event[];
}

const EVENTS_PER_PAGE = 10;

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

const Events = () => {
  const { user } = useAuth();
  const { canCreateEvents, isMember, isAdmin, loading: roleLoading } = useUserRole();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<FavoriteRoute[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePast, setHasMorePast] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [routeToDelete, setRouteToDelete] = useState<FavoriteRoute | null>(null);
  const [routeToEdit, setRouteToEdit] = useState<FavoriteRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState(false);
  const [syncingStrava, setSyncingStrava] = useState(false);
  const [stravaEventsRaw, setStravaEventsRaw] = useState<StravaClubEvent[]>([]);
  const [importedStravaIds, setImportedStravaIds] = useState<Set<string>>(new Set());

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: listRef, isVisible: listVisible } = useScrollAnimation();

  const fetchStravaEvents = async (): Promise<{ events: Event[], rawEvents: StravaClubEvent[] }> => {
    try {
      const { data: stravaEvents, error: stravaError } = await supabase
        .from("strava_club_events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (stravaError) {
        console.error("Error fetching Strava events:", stravaError);
        return { events: [], rawEvents: [] };
      }

      const rawEvents = stravaEvents || [];
      const mappedEvents = rawEvents.map((event: StravaClubEvent) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        location: event.address || "Viz Strava",
        route_link: null,
        participant_count: event.participant_count,
        is_participating: false,
        is_strava_event: true,
        strava_event_id: event.strava_event_id,
        organizing_athlete_name: event.organizing_athlete_name,
      }));
      
      return { events: mappedEvents, rawEvents };
    } catch (error) {
      console.error("Error fetching Strava events:", error);
      return { events: [], rawEvents: [] };
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      // Fetch local events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (eventsError) throw eventsError;

      const eventsWithDetails = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "going");

          let isParticipating = false;
          if (user) {
            const { data: participation } = await supabase
              .from("event_participants")
              .select("id")
              .eq("event_id", event.id)
              .eq("user_id", user.id)
              .eq("status", "going")
              .maybeSingle();
            isParticipating = !!participation;
          }

          return {
            ...event,
            participant_count: count || 0,
            is_participating: isParticipating,
            is_strava_event: false,
          };
        })
      );

      // Fetch Strava club events
      const { events: stravaEvents, rawEvents } = await fetchStravaEvents();
      setStravaEventsRaw(rawEvents);
      
      // Get list of strava_event_ids that are already imported as local events
      const importedIds = new Set(
        (eventsData || [])
          .filter((e: any) => e.strava_event_id)
          .map((e: any) => e.strava_event_id)
      );
      setImportedStravaIds(importedIds);
      
      // Filter out Strava events that are already imported as local events
      const unimportedStravaEvents = stravaEvents.filter(
        (e) => !importedIds.has(e.strava_event_id)
      );

      // Combine and sort by date
      const allEvents = [...eventsWithDetails, ...unimportedStravaEvents].sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      setUpcomingEvents(allEvents);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      toast.error("Nepodařilo se načíst vyjížďky");
    } finally {
      setLoadingUpcoming(false);
    }
  };

  const syncStravaEvents = async () => {
    setSyncingStrava(true);
    try {
      const { data, error } = await supabase.functions.invoke("strava-club-events");
      
      if (error) throw error;
      
      toast.success(`Synchronizováno ${data?.synced_count || 0} vyjížděk ze Strava`);
      await fetchUpcomingEvents();
    } catch (error) {
      console.error("Error syncing Strava events:", error);
      toast.error("Nepodařilo se synchronizovat vyjížďky ze Strava");
    } finally {
      setSyncingStrava(false);
    }
  };

  const fetchPastEvents = async (loadMore: boolean = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoadingPast(true);
    }
    
    try {
      const offset = loadMore ? pastEvents.length : 0;
      
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .lt("event_date", new Date().toISOString())
        .order("event_date", { ascending: false })
        .range(offset, offset + EVENTS_PER_PAGE - 1);

      if (eventsError) throw eventsError;

      // Check if there are more events
      setHasMorePast((eventsData?.length || 0) === EVENTS_PER_PAGE);

      const eventsWithDetails = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count: participantCount } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "going");

          const { count: photoCount } = await supabase
            .from("gallery_items")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            participant_count: participantCount || 0,
            is_participating: false,
            photo_count: photoCount || 0,
          };
        })
      );

      if (loadMore) {
        setPastEvents((prev) => [...prev, ...eventsWithDetails]);
      } else {
        setPastEvents(eventsWithDetails);
      }
    } catch (error) {
      console.error("Error fetching past events:", error);
      toast.error("Nepodařilo se načíst historii vyjížděk");
    } finally {
      setLoadingPast(false);
      setLoadingMore(false);
    }
  };

  const fetchFavoriteRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const { data, error } = await supabase
        .from("favorite_routes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavoriteRoutes(data || []);
    } catch (error) {
      console.error("Error fetching favorite routes:", error);
      toast.error("Nepodařilo se načíst oblíbené trasy");
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;

    setDeletingRoute(true);
    try {
      const { error } = await supabase
        .from("favorite_routes")
        .delete()
        .eq("id", routeToDelete.id);

      if (error) throw error;

      toast.success("Trasa byla smazána");
      setFavoriteRoutes((prev) => prev.filter((r) => r.id !== routeToDelete.id));
    } catch (error) {
      console.error("Error deleting route:", error);
      toast.error("Nepodařilo se smazat trasu");
    } finally {
      setDeletingRoute(false);
      setRouteToDelete(null);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents();
  }, [user]);

  useEffect(() => {
    if (activeTab === "history" && pastEvents.length === 0) {
      fetchPastEvents(false);
    }
    if (activeTab === "routes" && favoriteRoutes.length === 0) {
      fetchFavoriteRoutes();
    }
  }, [activeTab]);

  // Group past events by month
  const groupEventsByMonth = (events: Event[]): GroupedEvents[] => {
    const groups: GroupedEvents[] = [];

    events.forEach((event) => {
      const eventDate = new Date(event.event_date);
      const existingGroup = groups.find(
        (g) => isSameMonth(g.date, eventDate) && isSameYear(g.date, eventDate)
      );

      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({
          label: format(eventDate, "LLLL yyyy", { locale: cs }),
          date: eventDate,
          events: [event],
        });
      }
    });

    return groups;
  };

  const groupedPastEvents = groupEventsByMonth(pastEvents);

  const renderEventCard = (event: Event, index: number, isPast: boolean = false) => {
    const isStravaEvent = event.is_strava_event;
    const stravaEventUrl = isStravaEvent 
      ? `https://www.strava.com/clubs/1860524/group_events/${event.strava_event_id}` 
      : null;

    const CardWrapper = isStravaEvent ? 'a' : Link;
    const cardProps = isStravaEvent 
      ? { href: stravaEventUrl, target: "_blank", rel: "noopener noreferrer" }
      : { to: `/events/${event.id}` };

    return (
      <Card
        key={event.id}
        className={`hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 overflow-hidden animate-on-scroll slide-up ${listVisible ? "is-visible" : ""} ${isStravaEvent ? "border-[#FC4C02]/30" : ""}`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <CardWrapper {...cardProps as any}>
          {/* Cover Image Thumbnail */}
          {event.cover_image_url && (
            <div className="relative h-32 overflow-hidden">
              <img 
                src={event.cover_image_url} 
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}
          <CardHeader className={event.cover_image_url ? "pt-4" : ""}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {event.title}
                </CardTitle>
                {isStravaEvent && <StravaEventBadge />}
                {/* Show badge for local events imported from Strava */}
                {!isStravaEvent && event.strava_event_id && (
                  <Badge variant="outline" className="gap-1 text-[#FC4C02] border-[#FC4C02]/30">
                    Ze Strava
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Proběhlo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">
                  <Users className="w-3 h-3 mr-1" />
                  {event.participant_count}
                </Badge>
                {isPast && event.photo_count !== undefined && event.photo_count > 0 && (
                  <Badge variant="outline" className="shrink-0">
                    <Camera className="w-3 h-3 mr-1" />
                    {event.photo_count}
                  </Badge>
                )}
                {isStravaEvent ? (
                  <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-[#FC4C02] transition-colors" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <p className="text-muted-foreground line-clamp-2">{event.description}</p>
            )}

            {/* Organizer for Strava events */}
            {isStravaEvent && event.organizing_athlete_name && (
              <p className="text-sm text-muted-foreground">
                Organizuje: {event.organizing_athlete_name}
              </p>
            )}

            {/* Route Parameters Mini Badges */}
            {(event.distance_km || event.difficulty) && (
              <div className="flex flex-wrap gap-2">
                {event.distance_km && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Route className="w-3 h-3" />
                    {event.distance_km} km
                  </Badge>
                )}
                {event.elevation_m && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Mountain className="w-3 h-3" />
                    {event.elevation_m} m
                  </Badge>
                )}
                {event.difficulty && (
                  <Badge 
                    variant="outline" 
                    className={`gap-1 text-xs ${DIFFICULTY_COLORS[event.difficulty] || ""}`}
                  >
                    <Gauge className="w-3 h-3" />
                    {DIFFICULTY_LABELS[event.difficulty] || event.difficulty}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
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
            </div>
          </CardContent>
        </CardWrapper>
        
        {/* Participation Toggle - only for upcoming local events */}
        {!isPast && user && !isStravaEvent && (
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                {event.is_participating && (
                  <Badge variant="default">Přihlášen/a</Badge>
                )}
              </div>
              <EventParticipationToggle
                eventId={event.id}
                userId={user.id}
                isParticipating={event.is_participating}
                onToggle={fetchUpcomingEvents}
              />
            </div>
          </CardContent>
        )}

        {/* Strava link for Strava events */}
        {!isPast && isStravaEvent && (
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between border-t pt-4">
              {/* Import button for admins */}
              {isAdmin && stravaEventsRaw.find(e => e.strava_event_id === event.strava_event_id) && (
                <ImportStravaEventDialog
                  stravaEvent={stravaEventsRaw.find(e => e.strava_event_id === event.strava_event_id)!}
                  onImported={fetchUpcomingEvents}
                />
              )}
              {(!isAdmin || !stravaEventsRaw.find(e => e.strava_event_id === event.strava_event_id)) && <div />}
              <a
                href={stravaEventUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#FC4C02] hover:underline flex items-center gap-1"
              >
                Přihlásit se na Stravě
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div
            ref={headerRef}
            className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 animate-on-scroll slide-up ${headerVisible ? "is-visible" : ""}`}
          >
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Vyjížďky</h1>
              <p className="text-muted-foreground">
                Přehled plánovaných a minulých cyklistických vyjížděk klubu Eskocc
              </p>
            </div>
            {isMember && canCreateEvents && <CreateEventDialog onEventCreated={fetchUpcomingEvents} />}
          </div>

          {!isMember && !roleLoading ? (
            <MemberOnlyContent
              title="Vyjížďky pro členy"
              description="Pro zobrazení plánovaných vyjížděk a účast na nich se staň členem klubu."
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Nadcházející</span>
                  <span className="sm:hidden">Plán</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historie
                </TabsTrigger>
                <TabsTrigger value="routes" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span className="hidden sm:inline">Oblíbené trasy</span>
                  <span className="sm:hidden">Trasy</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" ref={listRef}>
                {/* Admin sync button */}
                {isAdmin && (
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={syncStravaEvents}
                      disabled={syncingStrava}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncingStrava ? "animate-spin" : ""}`} />
                      {syncingStrava ? "Synchronizuji..." : "Aktualizovat ze Strava"}
                    </Button>
                  </div>
                )}
                {loadingUpcoming ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <SkeletonEventCard key={i} />
                    ))}
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <Card className={`animate-on-scroll scale-in ${listVisible ? "is-visible" : ""}`}>
                    <CardContent className="py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Žádné nadcházející vyjížďky</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event, index) => renderEventCard(event, index, false))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {loadingPast ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <SkeletonEventCard key={i} />
                    ))}
                  </div>
                ) : pastEvents.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Zatím žádné proběhlé vyjížďky</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-8">
                    {groupedPastEvents.map((group) => (
                      <div key={group.label}>
                        <h3 className="text-lg font-semibold mb-4 capitalize text-muted-foreground border-b pb-2">
                          {group.label}
                        </h3>
                        <div className="space-y-4">
                          {group.events.map((event, index) => renderEventCard(event, index, true))}
                        </div>
                      </div>
                    ))}
                    
                    {hasMorePast && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => fetchPastEvents(true)}
                          disabled={loadingMore}
                          className="min-w-[200px]"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Načítání...
                            </>
                          ) : (
                            "Zobrazit další"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="routes">
                <div className="flex justify-end mb-4">
                  {canCreateEvents && <CreateRouteDialog onRouteCreated={fetchFavoriteRoutes} />}
                </div>
                {loadingRoutes ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : favoriteRoutes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MapIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Zatím žádné oblíbené trasy</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {favoriteRoutes.map((route) => (
                      <RouteListItem
                        key={route.id}
                        route={route}
                        canEdit={user?.id === route.created_by || isAdmin}
                        onEdit={setRouteToEdit}
                        onDelete={setRouteToDelete}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />

      {/* Edit Route Dialog */}
      {routeToEdit && (
        <EditRouteDialog
          route={routeToEdit}
          open={true}
          onOpenChange={(open) => !open && setRouteToEdit(null)}
          onRouteUpdated={() => {
            fetchFavoriteRoutes();
            setRouteToEdit(null);
          }}
        />
      )}

      {/* Delete Route Confirmation */}
      <AlertDialog open={!!routeToDelete} onOpenChange={() => setRouteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trasu?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat trasu "{routeToDelete?.title}"? Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoute}
              disabled={deletingRoute}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingRoute ? "Mazání..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Events;
