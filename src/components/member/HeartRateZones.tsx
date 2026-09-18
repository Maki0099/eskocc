import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse } from "lucide-react";

interface ZoneRow {
  zone_label: string;
  zone_min: number;
  zone_max: number;
  minutes: number;
  rides: number;
}

const HeartRateZones = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_heart_rate_zones" as any, {
        _user_id: userId,
        _year: year,
      });
      if (!active) return;
      setRows((data as any as ZoneRow[]) || []);
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
          <CardTitle className="text-lg flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            Tepové zóny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const totalMinutes = rows.reduce((sum, r) => sum + Number(r.minutes || 0), 0);
  if (totalMinutes === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-primary" />
          Tepové zóny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const pct = totalMinutes > 0 ? (Number(row.minutes) / totalMinutes) * 100 : 0;
          return (
            <div key={row.zone_label}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="font-medium">{row.zone_label}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(Number(row.minutes))} min · {row.rides}×
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted border border-border/60 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor:
                      row.zone_label.includes("Odpočinek")
                        ? "#94a3b8"
                        : row.zone_label.includes("Aerobní")
                          ? "#3b82f6"
                          : row.zone_label.includes("Tempo")
                            ? "#f59e0b"
                            : row.zone_label.includes("Anaerobní")
                              ? "#f97316"
                              : "#ef4444",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {row.zone_min}–{row.zone_max} bpm
              </p>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground pt-1">
          Zóny jsou odhadnuté podle věku z registrace (220 − věk).
        </p>
      </CardContent>
    </Card>
  );
};

export default HeartRateZones;
