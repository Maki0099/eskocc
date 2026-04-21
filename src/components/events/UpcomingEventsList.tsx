import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import EventCard, { type EventCardEvent } from "@/components/events/EventCard";
import { groupEventsByPeriod, matchesSportFilter, type SportFilter } from "@/lib/event-utils";

interface UpcomingEventsListProps {
  events: EventCardEvent[];
  userId?: string | null;
  isAdmin?: boolean;
  highlightId?: string;
  onChanged?: () => void;
  onDeleteRequest?: (event: EventCardEvent) => void;
}

const FILTERS: { value: SportFilter; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "road", label: "Silnice" },
  { value: "mtb", label: "MTB" },
  { value: "gravel", label: "Gravel" },
  { value: "gpx", label: "S GPX" },
];

const UpcomingEventsList = ({
  events,
  userId,
  isAdmin,
  highlightId,
  onChanged,
  onDeleteRequest,
}: UpcomingEventsListProps) => {
  const [filter, setFilter] = useState<SportFilter>("all");

  const filtered = useMemo(
    () => events.filter((e) => matchesSportFilter(e as any, filter)),
    [events, filter]
  );
  const groups = useMemo(() => groupEventsByPeriod(filtered as any), [filtered]);

  // Only show filter row if we have something to filter
  const showFilters = events.length > 3;

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
              className="rounded-full"
            >
              {f.label}
            </Button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {filter === "all"
            ? "Žádné nadcházející vyjížďky"
            : "V této kategorii nic není. Zkus jiný filtr."}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                {group.events.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.events.map((e) => (
                <EventCard
                  key={e.id}
                  event={e as EventCardEvent}
                  userId={userId}
                  isAdmin={isAdmin}
                  highlight={highlightId === e.id}
                  onChanged={onChanged}
                  onDeleteRequest={onDeleteRequest}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default UpcomingEventsList;
