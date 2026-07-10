import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface ProgressRow {
  day: string;
  day_km: number;
  cumulative_km: number;
}

interface ChartPoint {
  ts: number;
  day: string;
  dayKm: number;
  cumulativeKm: number;
}

interface Props {
  userId: string;
}

const MONTH_TICKS = (() => {
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1).getTime());
})();

const formatMonthTick = (value: number) =>
  format(new Date(value), "LLL", { locale: cs });

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">
        {format(new Date(p.ts), "d. MMMM yyyy", { locale: cs })}
      </div>
      <div className="mt-1 text-muted-foreground">
        Celkem: <span className="font-semibold text-foreground">{p.cumulativeKm.toLocaleString("cs-CZ")} km</span>
      </div>
      {p.dayKm > 0 && (
        <div className="text-muted-foreground">
          Ten den: {p.dayKm.toLocaleString("cs-CZ")} km
        </div>
      )}
    </div>
  );
};

const YearlyProgressChart = ({ userId }: Props) => {
  const [data, setData] = useState<ChartPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows, error } = await supabase.rpc(
        "get_member_yearly_progress",
        { _user_id: userId }
      );
      if (cancelled) return;
      if (error || !rows) {
        setData([]);
        setLoading(false);
        return;
      }

      const points: ChartPoint[] = (rows as ProgressRow[]).map((r) => ({
        ts: new Date(r.day).getTime(),
        day: r.day,
        dayKm: Number(r.day_km) || 0,
        cumulativeKm: Number(r.cumulative_km) || 0,
      }));

      if (points.length > 0) {
        const yearStart = new Date(year, 0, 1).getTime();
        if (points[0].ts > yearStart) {
          points.unshift({ ts: yearStart, day: `${year}-01-01`, dayKm: 0, cumulativeKm: 0 });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const last = points[points.length - 1];
        if (last.ts < today.getTime()) {
          points.push({
            ts: today.getTime(),
            day: today.toISOString().slice(0, 10),
            dayKm: 0,
            cumulativeKm: last.cumulativeKm,
          });
        }
      }

      setData(points);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, year]);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Průběh sezóny {year}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Zatím žádné aktivity v tomto roce.
          </p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={[new Date(year, 0, 1).getTime(), new Date(year, 11, 31).getTime()]}
                  ticks={MONTH_TICKS}
                  tickFormatter={formatMonthTick}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulativeKm"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#progressGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Kumulativní km z aktivit v klubu ESKO.cc na Stravě
        </p>
      </CardContent>
    </Card>
  );
};

export default YearlyProgressChart;
