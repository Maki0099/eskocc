import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonEventCard } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, ChevronRight, Camera, History, Loader2 } from "lucide-react";
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
}

interface GroupedEvents {
  label: string;
  date: Date;
  events: Event[];
}

const EVENTS_PER_PAGE = 10;

const Events = () => {
  const { user } = useAuth();
  const { canCreateEvents, isMember, loading: roleLoading } = useUserRole();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePast, setHasMorePast] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: listRef, isVisible: listVisible } = useScrollAnimation();

  const fetchUpcomingEvents = async () => {
    try {
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
          };
        })
      );

      setUpcomingEvents(eventsWithDetails);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      toast.error("Nepodařilo se načíst vyjížďky");
    } finally {
      setLoadingUpcoming(false);
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

  useEffect(() => {
    fetchUpcomingEvents();
  }, [user]);

  useEffect(() => {
    if (activeTab === "history" && pastEvents.length === 0) {
      fetchPastEvents(false);
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

  const renderEventCard = (event: Event, index: number, isPast: boolean = false) => (
    <Link key={event.id} to={`/events/${event.id}`}>
      <Card
        className={`hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 animate-on-scroll slide-up ${listVisible ? "is-visible" : ""}`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl group-hover:text-primary transition-colors">
                {event.title}
              </CardTitle>
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
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <p className="text-muted-foreground line-clamp-2">{event.description}</p>
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

          {!isPast && event.is_participating && (
            <Badge variant="default" className="mt-2">
              Přihlášen/a
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );

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
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Nadcházející
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historie
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" ref={listRef}>
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
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
