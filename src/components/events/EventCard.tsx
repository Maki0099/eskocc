import { Link } from "react-router-dom";
import { Calendar, MapPin, Route, Mountain, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EventParticipationToggle from "@/components/events/EventParticipationToggle";
import StravaEventBadge from "@/components/events/StravaEventBadge";
import EditEventDialog from "@/components/events/EditEventDialog";
import { pluralizeGoing } from "@/lib/event-utils";

export interface EventCardEvent {
  id: string;
  title: string;
  event_date: string;
  location: string;
  participant_count: number;
  is_participating: boolean;
  distance_km?: number | null;
  elevation_m?: number | null;
  is_strava_event?: boolean;
  strava_event_id?: string;
  sport_type?: string | null;
  women_only?: boolean | null;
  cover_image_url?: string | null;
  description?: string | null;
}

interface EventCardProps {
  event: EventCardEvent;
  userId?: string | null;
  isAdmin?: boolean;
  highlight?: boolean;
  onChanged?: () => void;
  onDeleteRequest?: (event: EventCardEvent) => void;
}

const SPORT_LABEL: Record<string, string> = {
  Ride: "Silnice",
  GravelRide: "Gravel",
  MountainBikeRide: "MTB",
  EBikeRide: "E-bike",
  EMountainBikeRide: "E-MTB",
  Run: "Běh",
};

const EventCard = ({
  event,
  userId,
  isAdmin,
  highlight,
  onChanged,
  onDeleteRequest,
}: EventCardProps) => {
  const isStrava = !!event.is_strava_event;
  const stravaUrl = isStrava
    ? `https://www.strava.com/clubs/1860524/group_events/${event.strava_event_id}`
    : null;
  const date = new Date(event.event_date);
  const dateLabel = format(date, "EEE d. M. · HH:mm", { locale: cs });

  const TitleWrap: any = isStrava ? "a" : Link;
  const titleProps = isStrava
    ? { href: stravaUrl!, target: "_blank", rel: "noopener noreferrer" }
    : { to: `/events/${event.id}` };

  const adminButtons = isAdmin && !isStrava && (
    <>
      <EditEventDialog
        event={event as any}
        onEventUpdated={onChanged || (() => {})}
        trigger={
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Pencil className="w-4 h-4" />
          </Button>
        }
      />
      {onDeleteRequest && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteRequest(event);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </>
  );

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 ${
        highlight ? "ring-1 ring-primary/30" : ""
      } ${isStrava ? "border-l-4 border-l-[#FC4C02]" : ""}`}
    >
      <div className="p-4 sm:p-5">
        {/* Top meta row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground min-w-0">
            <span className="font-medium text-foreground/80 capitalize">{dateLabel}</span>
            <span aria-hidden>·</span>
            <span>{pluralizeGoing(event.participant_count)}</span>
            {isStrava && (
              <>
                <span aria-hidden>·</span>
                <StravaEventBadge className="text-[10px] py-0 px-1.5 h-4" />
              </>
            )}
            {event.women_only && (
              <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-[10px] py-0 px-1.5 h-4">
                Pouze ženy
              </Badge>
            )}
          </div>

          {/* Desktop CTA + admin (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {adminButtons}
            {isStrava ? (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a href={stravaUrl!} target="_blank" rel="noopener noreferrer">
                  Strava
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            ) : userId ? (
              <EventParticipationToggle
                eventId={event.id}
                userId={userId}
                isParticipating={event.is_participating}
                onToggle={onChanged || (() => {})}
              />
            ) : null}
          </div>
        </div>

        {/* Title */}
        <TitleWrap {...titleProps} className="block group">
          <h3 className="text-base sm:text-lg font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {event.title}
          </h3>
        </TitleWrap>

        {/* Meta line */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
          {event.distance_km != null && (
            <span className="inline-flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5" />
              {event.distance_km} km
            </span>
          )}
          {event.elevation_m != null && (
            <span className="inline-flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5" />
              {event.elevation_m} m
            </span>
          )}
          {event.sport_type && SPORT_LABEL[event.sport_type] && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 opacity-0 hidden" aria-hidden />
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5">
                {SPORT_LABEL[event.sport_type]}
              </Badge>
            </span>
          )}
        </div>

        {/* Mobile CTA — full width below content */}
        <div className="sm:hidden mt-4 space-y-2">
          {isStrava ? (
            <Button
              asChild
              size="lg"
              className="w-full gap-2 bg-[#FC4C02] hover:bg-[#E34402] text-white h-12"
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
              fullWidth
              size="lg"
              showFullText
              className="h-12"
            />
          ) : null}

          {adminButtons && (
            <div className="flex justify-end gap-1 pt-1">{adminButtons}</div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EventCard;
