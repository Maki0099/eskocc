import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DayRow {
  day: string;
  km: number;
  elevation: number;
  rides: number;
}

const MONTHS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

const levelClass = (km: number) => {
  if (km <= 0) return "bg-muted";
  if (km < 25) return "bg-primary/25";
  if (km < 50) return "bg-primary/45";
  if (km < 100) return "bg-primary/70";
  return "bg-primary";
};

const ActivityHeatmap = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_member_activity_heatmap" as any, {
        _user_id: userId,
        _year: year,
      });
      if (!active) return;
      setRows((data as any as DayRow[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [userId, year]);

  const { weeks, monthLabels } = useMemo(() => {
    const map = new Map(rows.map((r) => [r.day, r]));
    const start = new Date(year, 0, 1);
    // posun na pondělí předcházející 1. lednu
    const offset = (start.getDay() + 6) % 7;
    const gridStart = new Date(year, 0, 1 - offset);
    const end = new Date(year, 11, 31);

    const weeks: { date: Date; row?: DayRow; inYear: boolean }[][] = [];
    const monthLabels: { index: number; label: string }[] = [];
    let cursor = new Date(gridStart);
    let lastMonth = -1;

    while (cursor <= end) {
      const week: { date: Date; row?: DayRow; inYear: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`;
        week.push({ date, row: map.get(key), inYear: date.getFullYear() === year });
        cursor.setDate(cursor.getDate() + 1);
      }
      const firstInYear = week.find((w) => w.inYear);
      if (firstInYear && firstInYear.date.getMonth() !== lastMonth) {
        lastMonth = firstInYear.date.getMonth();
        monthLabels.push({ index: weeks.length, label: MONTHS[lastMonth] });
      }
      weeks.push(week);
    }
    return { weeks, monthLabels };
  }, [rows, year]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Kalendář jízd {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Kalendář jízd {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto pb-2">
            <div className="inline-block min-w-full">
              <div className="flex gap-[3px] mb-1 pl-0">
                {weeks.map((_, i) => {
                  const label = monthLabels.find((m) => m.index === i);
                  return (
                    <div key={i} className="w-[11px] text-[9px] text-muted-foreground">
                      {label ? label.label.slice(0, 1) : ""}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((cell, di) => {
                      if (!cell.inYear) {
                        return <div key={di} className="w-[11px] h-[11px] rounded-[2px] opacity-0" />;
                      }
                      const km = cell.row?.km ?? 0;
                      return (
                        <Tooltip key={di}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-[11px] h-[11px] rounded-[2px] ${levelClass(km)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {cell.date.toLocaleDateString("cs-CZ")}
                            {km > 0
                              ? ` — ${km.toLocaleString("cs-CZ")} km, ${Number(
                                  cell.row?.elevation ?? 0
                                ).toLocaleString("cs-CZ")} m`
                              : " — bez jízdy"}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
          <span>méně</span>
          <div className="w-[11px] h-[11px] rounded-[2px] bg-muted" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/25" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/45" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary/70" />
          <div className="w-[11px] h-[11px] rounded-[2px] bg-primary" />
          <span>více</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmap;
