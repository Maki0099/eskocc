import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SportRow {
  sport_type: string;
  km: number;
  elevation: number;
  rides: number;
  moving_time: number;
}

const SPORT_LABELS: Record<string, string> = {
  Ride: "Silnice",
  GravelRide: "Gravel",
  MountainBikeRide: "Horské kolo",
  VirtualRide: "Trenažér",
  EBikeRide: "Elektrokolo",
  EMountainBikeRide: "Elektro MTB",
  Run: "Běh",
  TrailRun: "Trail",
  Walk: "Chůze",
  Hike: "Turistika",
  NordicSki: "Běžky",
  AlpineSki: "Sjezdovky",
  Swim: "Plavání",
  Workout: "Trénink",
};

const label = (s: string) => SPORT_LABELS[s] ?? s;

const SportBreakdown = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<SportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_member_sport_breakdown" as any, {
        _user_id: userId,
        _year: year,
      });
      if (!active) return;
      setRows((data as any as SportRow[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [userId, year]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Podle typu sportu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + Number(r.km || 0), 0) || 1;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Podle typu sportu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const pct = Math.round((Number(r.km) / total) * 100);
          return (
            <div key={r.sport_type}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="font-medium">{label(r.sport_type)}</span>
                <span className="text-muted-foreground text-xs">
                  {Number(r.km).toLocaleString("cs-CZ")} km · {r.rides}×
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted border border-border/60 overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SportBreakdown;
