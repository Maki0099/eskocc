import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface WeekRow {
  week_start: string;
  km: number;
  elevation: number;
  suffer: number;
  rides: number;
}

const WeeklyLoadChart = ({ userId }: { userId: string }) => {
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_weekly_load" as any, {
        _user_id: userId,
        _weeks: 12,
      });
      if (!active) return;
      setWeeks((data as any as WeekRow[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Týdenní zátěž
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (weeks.length < 2) return null;

  const half = Math.floor(weeks.length / 2);
  const recent = weeks.slice(half);
  const previous = weeks.slice(0, half);
  const sum = (arr: WeekRow[]) => arr.reduce((s, w) => s + Number(w.km), 0);
  const recentKm = sum(recent);
  const previousKm = sum(previous);
  const trendPct = previousKm > 0 ? ((recentKm - previousKm) / previousKm) * 100 : 0;

  const TrendIcon = trendPct > 5 ? TrendingUp : trendPct < -5 ? TrendingDown : Minus;
  const trendText =
    trendPct > 5
      ? `Forma stoupá (+${Math.round(trendPct)} %)`
      : trendPct < -5
        ? `Forma klesá (${Math.round(trendPct)} %)`
        : "Forma je stabilní";
  const trendColor =
    trendPct > 5
      ? "text-green-600 dark:text-green-400"
      : trendPct < -5
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  const chartData = weeks.map((w) => ({
    week: format(new Date(w.week_start), "d. M.", { locale: cs }),
    km: Number(w.km),
    elevation: Number(w.elevation),
  }));

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Týdenní zátěž
          </CardTitle>
          <span className={`text-sm font-medium inline-flex items-center gap-1.5 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            {trendText}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "km"
                    ? `${Number(value).toLocaleString("cs-CZ")} km`
                    : `${Number(value).toLocaleString("cs-CZ")} m`,
                  name === "km" ? "Vzdálenost" : "Převýšení",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "0.8rem",
                }}
              />
              <Bar dataKey="km" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Kilometry za posledních {weeks.length} týdnů
        </p>
      </CardContent>
    </Card>
  );
};

export default WeeklyLoadChart;
