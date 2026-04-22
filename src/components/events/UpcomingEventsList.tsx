import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { LayoutList, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import EventCard, { type EventCardEvent } from "@/components/events/EventCard";
import DayHeader from "@/components/events/DayHeader";
import EventsCalendarView from "@/components/events/EventsCalendarView";
import EventsEmptyState from "@/components/events/EventsEmptyState";
import { groupEventsByDay, matchesSportFilter, type SportFilter } from "@/lib/event-utils";

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

type ViewMode = "list" | "calendar";
const VIEW_STORAGE_KEY = "events:viewMode";

const UpcomingEventsList = ({
  events,
  userId,
  isAdmin,
  highlightId,
  onChanged,
  onDeleteRequest,
}: UpcomingEventsListProps) => {
  const [filter, setFilter] = useState<SportFilter>("all");
  const [view, setView] = useState<ViewMode>("list");

  // Restore preferred view
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
      if (saved === "list" || saved === "calendar") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(
    () => events.filter((e) => matchesSportFilter(e as any, filter)),
    [events, filter]
  );
  const dayGroups = useMemo(() => groupEventsByDay(filtered as EventCardEvent[]), [filtered]);

  const showFilters = events.length > 3;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showFilters ? (
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
        ) : (
          <span />
        )}

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && handleViewChange(v as ViewMode)}
          className="ml-auto"
        >
          <ToggleGroupItem value="list" aria-label="Zobrazit jako seznam" size="sm">
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5 text-xs">Seznam</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="Zobrazit jako kalendář" size="sm">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5 text-xs">Kalendář</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {dayGroups.length === 0 ? (
        events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Žádné nadcházející vyjížďky
          </p>
        ) : (
          <EventsEmptyState variant="filtered" onClearFilter={() => setFilter("all")} />
        )
      ) : (
        <div className="space-y-6">
          {view === "calendar" && (
            <EventsCalendarView
              events={filtered as EventCardEvent[]}
              onDaySelect={(key) => {
                const el = document.getElementById(`day-${key}`);
                if (!el) return;
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                el.classList.add("ring-2", "ring-primary", "rounded-md");
                window.setTimeout(() => {
                  el.classList.remove("ring-2", "ring-primary", "rounded-md");
                }, 1600);
              }}
            />
          )}

          <div className="space-y-8">
            {dayGroups.map((group, idx) => {
              const prev = dayGroups[idx - 1];
              const monthChanged =
                !prev || prev.date.getMonth() !== group.date.getMonth() ||
                prev.date.getFullYear() !== group.date.getFullYear();
              const showMonthDivider = monthChanged && idx > 0;

              return (
                <div key={group.key}>
                  {showMonthDivider && (
                    <div className="flex items-center gap-3 mb-6 mt-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {format(group.date, "LLLL yyyy", { locale: cs })}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <DayHeader
                    date={group.date}
                    count={group.events.length}
                    id={`day-${group.key}`}
                  />
                  <div className="space-y-3">
                    {group.events.map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        userId={userId}
                        isAdmin={isAdmin}
                        highlight={highlightId === e.id}
                        onChanged={onChanged}
                        onDeleteRequest={onDeleteRequest}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingEventsList;
