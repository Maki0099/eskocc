import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonEventCard } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
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
}

const Events = () => {
  const { user } = useAuth();
  const { canCreateEvents } = useUserRole();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: listRef, isVisible: listVisible } = useScrollAnimation();

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (eventsError) throw eventsError;

      // Get participant counts and user participation status
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

      setEvents(eventsWithDetails);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Nepodařilo se načíst vyjížďky");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div 
            ref={headerRef}
            className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 animate-on-scroll slide-up ${headerVisible ? 'is-visible' : ''}`}
          >
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Nadcházející vyjížďky</h1>
              <p className="text-muted-foreground">
                Přehled plánovaných cyklistických vyjížděk klubu Eskocc
              </p>
            </div>
            {canCreateEvents && <CreateEventDialog onEventCreated={fetchEvents} />}
          </div>

          <div ref={listRef}>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <SkeletonEventCard key={i} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <Card className={`animate-on-scroll scale-in ${listVisible ? 'is-visible' : ''}`}>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Žádné nadcházející vyjížďky
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <Link key={event.id} to={`/events/${event.id}`}>
                    <Card 
                      className={`hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1 animate-on-scroll slide-up ${listVisible ? 'is-visible' : ''}`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {event.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="shrink-0">
                              <Users className="w-3 h-3 mr-1" />
                              {event.participant_count}
                            </Badge>
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

                        {event.is_participating && (
                          <Badge variant="default" className="mt-2">Přihlášen/a</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
