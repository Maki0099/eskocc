import { Link } from "react-router-dom";
import { Calendar, MapPin, Route, Mountain, Users, ExternalLink, ArrowRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EventParticipationToggle from "@/components/events/EventParticipationToggle";
import StravaEventBadge from "@/components/events/StravaEventBadge";
import type { EventCardEvent } from "@/components/events/EventCard";
import { pluralizeGoing } from "@/lib/event-utils";

interface NextUpHeroProps {
  event: EventCardEvent;
  userId?: string | null;
  onChanged?: () => void;
}

const NextUpHero = ({ event, userId, onChanged }: NextUpHeroProps) => {
  const isStrava = !!event.is_strava_event;
  const stravaUrl = isStrava
    ? `https://www.strava.com/clubs/1860524/group_events/${event.strava_event_id}`
    : null;
  const date = new Date(event.event_date);
  const countdown = formatDistanceToNow(date, { addSuffix: true, locale: cs });
  const fullDate = format(date, "EEEE d. MMMM · HH:mm", { locale: cs });

  return (
    <Card
      className={`relative overflow-hidden mb-8 border-2 ${
        isStrava ? "border-[#FC4C02]/40" : "border-primary/40"
      }`}
    >
      {/* Subtle gradient accent */}
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          isStrava ? "bg-[#FC4C02]" : "bg-primary"
        }`}
      />

      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="uppercase tracking-wide text-[10px]">
            Další na řadě
          </Badge>
          <span className="text-sm text-muted-foreground capitalize">{countdown}</span>
          {isStrava && <StravaEventBadge className="text-[10px] py-0 px-1.5 h-5" />}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">
          {isStrava ? (
            <a
              href={stravaUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FC4C02] transition-colors inline-flex items-center gap-2"
            >
              {event.title}
              <ExternalLink className="w-5 h-5" />
            </a>
          ) : (
            <Link to={`/events/${event.id}`} className="hover:text-primary transition-colors inline-flex items-center gap-2">
              {event.title}
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-5">
          <span className="inline-flex items-center gap-1.5 capitalize">
            <Calendar className="w-4 h-4" />
            {fullDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {event.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {pluralizeGoing(event.participant_count)}
          </span>
        </div>

        {(event.distance_km != null || event.elevation_m != null) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {event.distance_km != null && (
              <Badge variant="outline" className="gap-1.5 text-sm py-1 px-2.5">
                <Route className="w-3.5 h-3.5" />
                {event.distance_km} km
              </Badge>
            )}
            {event.elevation_m != null && (
              <Badge variant="outline" className="gap-1.5 text-sm py-1 px-2.5">
                <Mountain className="w-3.5 h-3.5" />
                {event.elevation_m} m
              </Badge>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          {isStrava ? (
            <Button
              asChild
              size="lg"
              className="gap-2 bg-[#FC4C02] hover:bg-[#E34402] text-white w-full sm:w-auto h-12"
            >
              <a href={stravaUrl!} target="_blank" rel="noopener noreferrer">
                Otevřít na Stravě
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          ) : userId ? (
            <EventParticipationToggle
              eventId={event.id}
              userId={userId}
              isParticipating={event.is_participating}
              onToggle={onChanged || (() => {})}
              size="lg"
              showFullText
              className="w-full sm:w-auto h-12"
            />
          ) : null}
          {!isStrava && (
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12">
              <Link to={`/events/${event.id}`}>Detail vyjížďky</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default NextUpHero;
