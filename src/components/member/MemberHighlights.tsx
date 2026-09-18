import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge, Route, Mountain, CalendarDays, HeartPulse, Flame } from "lucide-react";

interface Highlights {
  rides: number;
  total_km: number | null;
  total_elevation: number | null;
  moving_time: number | null;
  longest_ride_km: number | null;
  longest_ride_date: string | null;
  biggest_climb_m: number | null;
  biggest_climb_date: string | null;
  avg_speed_kmh: number | null;
  max_speed_kmh: number | null;
  avg_heartrate: number | null;
  total_calories: number | null;
  best_month: number | null;
  best_month_km: number | null;
  active_days: number | null;
}

const MONTHS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

const fmt = (n: number | null | undefined, unit = "") =>
  n === null || n === undefined ? "—" : `${Number(n).toLocaleString("cs-CZ")}${unit}`;

const MemberHighlights = ({ userId }: { userId: string }) => {
  const [data, setData] = useState<Highlights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: rows } = await supabase.rpc("get_member_highlights" as any, {
        _user_id: userId,
      });
      if (!active) return;
      const row = Array.isArray(rows) ? (rows[0] as any) : null;
      setData(row ?? null);
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
          <CardTitle className="text-lg">Ukazatele sezóny</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.rides) return null;

  const hours = data.moving_time ? Math.round(data.moving_time / 3600) : null;

  const items = [
    { icon: Route, label: "Nejdelší jízda", value: fmt(data.longest_ride_km, " km") },
    { icon: Mountain, label: "Největší převýšení", value: fmt(data.biggest_climb_m, " m") },
    { icon: Gauge, label: "Průměrná rychlost", value: fmt(data.avg_speed_kmh, " km/h") },
    { icon: Gauge, label: "Nejvyšší rychlost", value: fmt(data.max_speed_kmh, " km/h") },
    { icon: CalendarDays, label: "Dní na kole", value: fmt(data.active_days) },
    { icon: CalendarDays, label: "Hodin v sedle", value: fmt(hours, " h") },
    ...(data.avg_heartrate
      ? [{ icon: HeartPulse, label: "Průměrný tep", value: fmt(data.avg_heartrate, " tepů/min") }]
      : []),
    ...(data.total_calories
      ? [{ icon: Flame, label: "Spáleno", value: fmt(Math.round(data.total_calories), " kcal") }]
      : []),
  ];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Ukazatele sezóny</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </div>
              <p className="text-lg font-semibold leading-tight">{item.value}</p>
            </div>
          ))}
        </div>
        {data.best_month !== null && (
          <p className="text-xs text-muted-foreground mt-4">
            Nejaktivnější měsíc: <span className="font-medium text-foreground">
              {MONTHS[(data.best_month ?? 1) - 1]}
            </span>{" "}
            ({fmt(data.best_month_km, " km")})
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberHighlights;
