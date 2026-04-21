import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EventCardEvent } from "@/components/events/EventCard";

interface EventsCalendarViewProps {
  events: EventCardEvent[];
  onDaySelect?: (key: string) => void;
}

const EventsCalendarView = ({ events, onDaySelect }: EventsCalendarViewProps) => {
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

  const firstEventDate = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    return sorted[0] ? new Date(sorted[0].event_date) : new Date();
  }, [events]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-lg border bg-card p-2 sm:p-4">
        <Calendar
          mode="single"
          defaultMonth={firstEventDate}
          locale={cs}
          weekStartsOn={1}
          showOutsideDays
          onDayClick={(day) => {
            const key = format(day, "yyyy-MM-dd");
            if (eventsByDay.has(key)) onDaySelect?.(key);
          }}
          className={cn("p-0 pointer-events-auto w-full")}
          classNames={{
            months: "flex flex-col w-full",
            month: "space-y-4 w-full",
            table: "w-full border-collapse",
            head_row: "flex w-full",
            head_cell:
              "text-muted-foreground rounded-md flex-1 font-normal text-[0.75rem] uppercase",
            row: "flex w-full mt-1",
            cell: "flex-1 aspect-square text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: "h-full w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md",
            day_today: "bg-accent/50 text-accent-foreground font-semibold",
          }}
          components={{
            DayContent: ({ date }) => {
              const key = format(date, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(key);
              const count = dayEvents?.length ?? 0;
              const dotCount = Math.min(count, 3);

              const inner = (
                <div className="relative flex h-full w-full items-center justify-center">
                  <span className={cn(count > 0 && "font-semibold text-primary")}>
                    {date.getDate()}
                  </span>
                  {count > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-[2px]">
                      {Array.from({ length: dotCount }).map((_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-primary"
                        />
                      ))}
                      {count > 3 && (
                        <span className="ml-[1px] text-[8px] font-bold leading-none text-primary">
                          +
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );

              if (!dayEvents || dayEvents.length === 0) return inner;

              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-full w-full">{inner}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs font-semibold mb-1">
                      {format(date, "EEEE d. MMMM", { locale: cs })}
                      <span className="ml-1.5 text-muted-foreground font-normal">
                        · {dayEvents.length}{" "}
                        {dayEvents.length === 1
                          ? "jízda"
                          : dayEvents.length <= 4
                            ? "jízdy"
                            : "jízd"}
                      </span>
                    </p>
                    <ul className="space-y-1">
                      {dayEvents.slice(0, 5).map((e) => (
                        <li key={e.id} className="text-xs text-muted-foreground truncate">
                          • {format(new Date(e.event_date), "HH:mm")} {e.title}
                        </li>
                      ))}
                      {dayEvents.length > 5 && (
                        <li className="text-xs text-muted-foreground italic">
                          a další {dayEvents.length - 5}…
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              );
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default EventsCalendarView;
