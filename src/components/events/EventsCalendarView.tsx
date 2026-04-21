import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EventCard, { type EventCardEvent } from "@/components/events/EventCard";
import { cn } from "@/lib/utils";

interface EventsCalendarViewProps {
  events: EventCardEvent[];
  userId?: string | null;
  isAdmin?: boolean;
  highlightId?: string;
  onChanged?: () => void;
  onDeleteRequest?: (event: EventCardEvent) => void;
}

const EventsCalendarView = ({
  events,
  userId,
  isAdmin,
  highlightId,
  onChanged,
  onDeleteRequest,
}: EventsCalendarViewProps) => {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventCardEvent[]>();
    for (const e of events) {
      const key = format(new Date(e.event_date), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const eventDays = useMemo(
    () => Array.from(eventsByDay.keys()).map((k) => new Date(k + "T00:00:00")),
    [eventsByDay]
  );

  const firstEventDate = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    return sorted[0] ? new Date(sorted[0].event_date) : new Date();
  }, [events]);

  const openEvents = openDay ? eventsByDay.get(openDay) ?? [] : [];
  const openDate = openDay ? new Date(openDay + "T00:00:00") : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-2 sm:p-4">
        <Calendar
          mode="single"
          defaultMonth={firstEventDate}
          locale={cs}
          weekStartsOn={1}
          showOutsideDays
          modifiers={{ hasEvent: eventDays }}
          modifiersClassNames={{
            hasEvent:
              "relative font-semibold text-primary after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
          }}
          onDayClick={(day) => {
            const key = format(day, "yyyy-MM-dd");
            if (eventsByDay.has(key)) setOpenDay(key);
          }}
          className={cn("p-0 pointer-events-auto w-full")}
          classNames={{
            months: "flex flex-col w-full",
            month: "space-y-4 w-full",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.75rem] uppercase",
            row: "flex w-full mt-1",
            cell: "flex-1 aspect-square text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: "h-full w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md",
            day_today: "bg-accent/50 text-accent-foreground",
          }}
        />
      </div>

      <Popover open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <PopoverTrigger asChild>
          <span className="sr-only" />
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,28rem)] max-h-[70vh] overflow-y-auto" align="center">
          {openDate && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {format(openDate, "EEEE", { locale: cs })}
              </p>
              <p className="text-base font-semibold">
                {format(openDate, "d. MMMM yyyy", { locale: cs })}
              </p>
            </div>
          )}
          <div className="space-y-3">
            {openEvents.map((e) => (
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
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EventsCalendarView;
