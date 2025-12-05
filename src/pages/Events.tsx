import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react";
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleJoin = async (eventId: string) => {
    if (!user) {
      toast.error("Pro přihlášení na vyjížďku se musíte přihlásit");
      return;
    }

    try {
      const { error } = await supabase.from("event_participants").insert({
        event_id: eventId,
        user_id: user.id,
        status: "going",
      });

      if (error) throw error;

      toast.success("Úspěšně přihlášeno na vyjížďku");
      fetchEvents();
    } catch (error: any) {
      console.error("Error joining event:", error);
      toast.error(error.message || "Nepodařilo se přihlásit na vyjížďku");
    }
  };

  const handleLeave = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Odhlášeno z vyjížďky");
      fetchEvents();
    } catch (error: any) {
      console.error("Error leaving event:", error);
      toast.error("Nepodařilo se odhlásit z vyjížďky");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Nadcházející vyjížďky</h1>
          <p className="text-muted-foreground mb-8">
            Přehled plánovaných cyklistických vyjížděk klubu Eskocc
          </p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Žádné nadcházející vyjížďky
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        <Users className="w-3 h-3 mr-1" />
                        {event.participant_count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.description && (
                      <p className="text-muted-foreground">{event.description}</p>
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

                    <div className="flex items-center gap-3 pt-2">
                      {event.route_link && (
                        <Button variant="outline" size="sm" asChild>
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

                      {user && (
                        event.is_participating ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLeave(event.id)}
                          >
                            Odhlásit se
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleJoin(event.id)}>
                            Přihlásit se
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
