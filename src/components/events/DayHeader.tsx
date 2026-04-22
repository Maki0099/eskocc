import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getRelativeDayLabel } from "@/lib/event-utils";

interface DayHeaderProps {
  date: Date;
  count?: number;
  sticky?: boolean;
  id?: string;
}

const DayHeader = ({ date, count, sticky = true, id }: DayHeaderProps) => {
  const relative = getRelativeDayLabel(date);
  const weekday = format(date, "EEE", { locale: cs }).toUpperCase();
  const dateLabel = format(date, "d. MMMM", { locale: cs });
  const isToday = relative === "dnes";

  return (
    <div
      id={id}
      className={cn(
        "flex items-baseline justify-between gap-3 mb-3 py-2 px-1 -mx-1",
        sticky && "sticky top-16 z-30 bg-background/85 backdrop-blur-md border-b border-border/40 shadow-[0_1px_0_0_hsl(var(--border)/0.3)]"
      )}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full shrink-0 translate-y-[-2px]",
            isToday ? "bg-primary" : "bg-muted-foreground/40"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "text-sm font-bold tracking-wide",
            isToday ? "text-primary" : "text-foreground"
          )}
        >
          {weekday}
        </span>
        <span className="text-sm sm:text-base font-semibold text-foreground truncate">
          {dateLabel}
        </span>
        {typeof count === "number" && count > 1 && (
          <span className="text-xs text-muted-foreground">· {count} jízd</span>
        )}
      </div>
      {relative && (
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wide shrink-0",
            isToday ? "text-primary" : "text-muted-foreground"
          )}
        >
          {relative}
        </span>
      )}
    </div>
  );
};

export default DayHeader;
