import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EventParticipationToggle from "@/components/events/EventParticipationToggle";
import StravaEventBadge from "@/components/events/StravaEventBadge";
import { Calendar, MapPin, Users, ChevronRight, Route, Mountain, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ROUTES } from "@/lib/routes";

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  location: string;
  participant_count: number;
  is_participating: boolean;
  distance_km: number | null;
  elevation_m: number | null;
  is_strava_event?: boolean;
  strava_event_id?: string;
}

interface UpcomingEventsWidgetProps {
  userId: string;
}

const UpcomingEventsWidget = ({ userId }: UpcomingEventsWidgetProps) => {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      // Fetch local events
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("id, title, event_date, location, distance_km, elevation_m")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5);

      if (error) throw error;

      const eventsWithDetails = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "going");

          const { data: participation } = await supabase
            .from("event_participants")
            .select("id")
            .eq("event_id", event.id)
            .eq("user_id", userId)
            .eq("status", "going")
            .maybeSingle();

          return {
            ...event,
            participant_count: count || 0,
            is_participating: !!participation,
            is_strava_event: false,
          };
        })
      );

      // Fetch Strava club events
      const { data: stravaEvents } = await supabase
        .from("strava_club_events")
        .select("id, strava_event_id, title, event_date, address, participant_count")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(5);

      const stravaEventsFormatted = (stravaEvents || []).map((event) => ({
        id: event.id,
        title: event.title,
        event_date: event.event_date,
        location: event.address || "Viz Strava",
        participant_count: event.participant_count,
        is_participating: false,
        distance_km: null,
        elevation_m: null,
        is_strava_event: true,
        strava_event_id: event.strava_event_id,
      }));

      // Combine, sort by date, and take first 3
      const allEvents = [...eventsWithDetails, ...stravaEventsFormatted]
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 3);

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Nadcházející vyjížďky
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 rounded-lg border">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Nadcházející vyjížďky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádné nadcházející vyjížďky
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link to={ROUTES.EVENTS}>Zobrazit všechny vyjížďky</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Nadcházející vyjížďky
          </CardTitle>
          <Link 
            to={ROUTES.EVENTS}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Vše
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event) => {
          const isStrava = event.is_strava_event;
          const stravaUrl = isStrava 
            ? `https://www.strava.com/clubs/1860524/group_events/${event.strava_event_id}` 
            : null;

          return (
            <div
              key={event.id}
              className={`p-3 rounded-lg border hover:bg-accent/50 transition-colors ${isStrava ? "border-[#FC4C02]/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                {isStrava ? (
                  <a href={stravaUrl!} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate hover:text-[#FC4C02] transition-colors">
                        {event.title}
                      </h4>
                      <StravaEventBadge className="text-[10px] py-0 px-1.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.event_date), "d. M. HH:mm", { locale: cs })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.participant_count}
                      </span>
                    </div>
                  </a>
                ) : (
                  <Link to={`/events/${event.id}`} className="flex-1 min-w-0">
                    <h4 className="font-medium truncate hover:text-primary transition-colors">
                      {event.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.event_date), "d. M. HH:mm", { locale: cs })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {event.participant_count}
                      </span>
                    </div>
                    {(event.distance_km || event.elevation_m) && (
                      <div className="flex items-center gap-2 mt-2">
                        {event.distance_km && (
                          <Badge variant="outline" className="text-xs gap-1 py-0">
                            <Route className="w-3 h-3" />
                            {event.distance_km} km
                          </Badge>
                        )}
                        {event.elevation_m && (
                          <Badge variant="outline" className="text-xs gap-1 py-0">
                            <Mountain className="w-3 h-3" />
                            {event.elevation_m} m
                          </Badge>
                        )}
                      </div>
                    )}
                  </Link>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  {isStrava ? (
                    <a
                      href={stravaUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FC4C02] hover:text-[#E34402]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <>
                      {event.is_participating && (
                        <Badge variant="default" className="text-xs">Jdu</Badge>
                      )}
                      <EventParticipationToggle
                        eventId={event.id}
                        userId={userId}
                        isParticipating={event.is_participating}
                        onToggle={fetchEvents}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UpcomingEventsWidget;
