import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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
  target: number;
  day_elevation: number;
  cumulative_elevation: number;
}

interface ChartPoint {
  ts: number;
  day: string;
  dayKm: number;
  cumulativeKm: number;
  dayElevation: number;
  cumulativeElevation: number;
}

type Metric = "distance" | "elevation";

interface Props {
  userId: string;
}

const MONTH_TICKS = (() => {
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1).getTime());
})();

const formatMonthTick = (value: number) =>
  format(new Date(value), "LLL", { locale: cs });

const YearlyProgressChart = ({ userId }: Props) => {
  const [data, setData] = useState<ChartPoint[] | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>("distance");
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const isDistance = metric === "distance";
  const unit = isDistance ? "km" : "m";

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as ChartPoint;
    const total = isDistance ? p.cumulativeKm : p.cumulativeElevation;
    const dayValue = isDistance ? p.dayKm : p.dayElevation;
    const achieved = isDistance && target && target > 0
      ? Math.round((p.cumulativeKm / target) * 100)
      : 0;
    return (
      <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="font-medium text-foreground">
          {format(new Date(p.ts), "d. MMMM yyyy", { locale: cs })}
        </div>
        <div className="mt-1 text-muted-foreground">
          Celkem: <span className="font-semibold text-foreground">{total.toLocaleString("cs-CZ")} {unit}</span>
        </div>
        {isDistance && target && target > 0 && (
          <div className="text-muted-foreground">
            Plnění cíle: <span className="font-semibold text-foreground">{achieved}%</span>
          </div>
        )}
        {dayValue > 0 && (
          <div className="text-muted-foreground">
            Ten den: {dayValue.toLocaleString("cs-CZ")} {unit}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTarget(null);
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

      const typedRows = rows as ProgressRow[];
      const memberTarget = typedRows.length > 0 ? Number(typedRows[0].target) || 0 : 0;
      setTarget(memberTarget > 0 ? memberTarget : null);

      const points: ChartPoint[] = typedRows.map((r) => ({
        ts: new Date(r.day).getTime(),
        day: r.day,
        dayKm: Number(r.day_km) || 0,
        cumulativeKm: Number(r.cumulative_km) || 0,
        dayElevation: Number(r.day_elevation) || 0,
        cumulativeElevation: Number(r.cumulative_elevation) || 0,
      }));

      if (points.length > 0) {
        const yearStart = new Date(year, 0, 1).getTime();
        if (points[0].ts > yearStart) {
          points.unshift({
            ts: yearStart,
            day: `${year}-01-01`,
            dayKm: 0,
            cumulativeKm: 0,
            dayElevation: 0,
            cumulativeElevation: 0,
          });
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
            dayElevation: 0,
            cumulativeElevation: last.cumulativeElevation,
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

  const values = data?.map((d) => (isDistance ? d.cumulativeKm : d.cumulativeElevation)) ?? [];
  const targetForAxis = isDistance ? target || 0 : 0;
  const maxY = values.length > 0 ? Math.max(...values, targetForAxis) : targetForAxis;

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Průběh sezóny {year}</CardTitle>
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setMetric("distance")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isDistance ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Kilometry
            </button>
            <button
              type="button"
              onClick={() => setMetric("elevation")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                !isDistance ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Převýšení
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Zatím žádné aktivity v tomto roce.
          </p>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
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
                  domain={[0, maxY > 0 ? Math.round(maxY * 1.08) : "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={isDistance ? "cumulativeKm" : "cumulativeElevation"}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#progressGradient)"
                />
                {isDistance && target && target > 0 && (
                  <ReferenceLine
                    y={target}
                    stroke="hsl(var(--accent))"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `Cíl ${target.toLocaleString("cs-CZ")} km`,
                      position: "insideTopRight",
                      fill: "hsl(var(--accent))",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {isDistance
            ? "Kumulativní km z aktivit v klubu ESKO.cc na Stravě"
            : "Kumulativní nastoupané metry z aktivit v klubu ESKO.cc na Stravě"}
          {isDistance && target && target > 0 && (
            <span className="block mt-1">
              Přerušovaná čára = roční cíl ({target.toLocaleString("cs-CZ")} km)
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
};

export default YearlyProgressChart;
