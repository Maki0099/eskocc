import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface StravaEvent {
  id: string;
  strava_event_id: string;
  title: string;
  event_date: string;
  address: string | null;
  participant_count: number;
  updated_at: string;
}

export function StravaEventsSyncAdmin() {
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<StravaEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchCachedEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("strava_club_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      
      setEvents(data || []);
      if (data && data.length > 0) {
        // Get the most recent updated_at as last sync time
        const mostRecent = data.reduce((latest, event) => 
          new Date(event.updated_at) > new Date(latest.updated_at) ? event : latest
        );
        setLastSync(mostRecent.updated_at);
      }
    } catch (error) {
      console.error("Error fetching cached events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("strava-club-events");
      
      if (error) throw error;
      
      toast.success(`Synchronizováno ${data?.synced_count || 0} vyjížděk ze Strava`);
      await fetchCachedEvents();
    } catch (error) {
      console.error("Error syncing Strava events:", error);
      toast.error("Nepodařilo se synchronizovat vyjížďky ze Strava");
    } finally {
      setSyncing(false);
    }
  };

  // Fetch on mount
  useState(() => {
    fetchCachedEvents();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#FC4C02]" aria-hidden="true">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.172" />
              </svg>
              Strava Club Events
            </CardTitle>
            <CardDescription>
              Synchronizace plánovaných vyjížděk z Strava klubu ESKO.cc
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synchronizuji..." : "Synchronizovat"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Poslední synchronizace: {format(new Date(lastSync), "d. MMMM yyyy, HH:mm", { locale: cs })}
          </p>
        )}

        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Načítání...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Žádné naplánované vyjížďky na Stravě</p>
            <p className="text-sm mt-1">Klikněte na "Synchronizovat" pro načtení</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[#FC4C02]/20 bg-[#FC4C02]/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{event.title}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {event.participant_count} účastníků
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(event.event_date), "EEEE d. MMMM yyyy, HH:mm", { locale: cs })}
                    </span>
                    {event.address && (
                      <span className="ml-4">{event.address}</span>
                    )}
                  </div>
                </div>
                <a
                  href={`https://www.strava.com/clubs/1860524/group_events/${event.strava_event_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FC4C02] hover:text-[#E34402] shrink-0 ml-4"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Vyjížďky ze Strava se automaticky synchronizují každých 24 hodin. 
            Zobrazují se společně s lokálními vyjížďkami na stránce Vyjížďky.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
