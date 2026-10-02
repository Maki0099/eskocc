import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ExternalLink, Filter, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  member_name: string;
  strava_activity_id: string;
  name: string | null;
  sport_type: string;
  activity_date: string;
  distance_m: number;
  moving_time: number;
  elevation_gain: number;
  average_speed: number | null;
  looks_like_bike: boolean;
}

const km = (m: number) => (m / 1000).toFixed(1);

export const UnsupportedActivitiesAdmin = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_unsupported_activities" as any, { _days: 365 });
    if (error) toast.error("Nepodařilo se načíst vyřazené aktivity");
    else setRows((data as unknown as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map<string, { count: number; km: number; members: Set<string>; last: string; bike: boolean }>();
    for (const r of rows) {
      const g = m.get(r.sport_type) ?? { count: 0, km: 0, members: new Set(), last: r.activity_date, bike: false };
      g.count++; g.km += r.distance_m / 1000; g.members.add(r.member_name);
      if (r.activity_date > g.last) g.last = r.activity_date;
      if (/bike|ride|cycl|velo/i.test(r.sport_type)) g.bike = true;
      m.set(r.sport_type, g);
    }
    return [...m.entries()].sort((a, b) => Number(b[1].bike) - Number(a[1].bike) || b[1].count - a[1].count);
  }, [rows]);

  const visible = type ? rows.filter((r) => r.sport_type === type) : rows;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" />Vyřazené typy aktivit</CardTitle>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Obnovit
          </Button>
        </div>
        <CardDescription>
          Aktivity ze Stravy za poslední rok, které se nepočítají do cyklistických statistik a tras.
          Zvýrazněné typy vypadají jako kolo – může jít o novou kategorii, kterou je třeba doplnit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žádné vyřazené aktivity.</p>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {groups.map(([t, g]) => (
                <button
                  key={t}
                  onClick={() => setType(type === t ? null : t)}
                  className={cn(
                    "text-left p-3 rounded-xl border transition-colors",
                    g.bike ? "border-destructive/50 bg-destructive/5" : "border-border/50",
                    type === t && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-medium text-sm">
                    {g.bike && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}{t}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {g.count}× · {g.km.toFixed(0)} km · {g.members.size} členů
                  </p>
                  <p className="text-xs text-muted-foreground">naposledy {new Date(g.last).toLocaleDateString("cs-CZ")}</p>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {visible.slice(0, 200).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.name || "Bez názvu"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.member_name} · {new Date(r.activity_date).toLocaleDateString("cs-CZ")} · {km(r.distance_m)} km · {r.elevation_gain} m
                      {r.average_speed ? ` · ${(r.average_speed * 3.6).toFixed(1)} km/h` : ""}
                    </p>
                  </div>
                  <Badge variant={r.looks_like_bike ? "destructive" : "outline"}>{r.sport_type}</Badge>
                  <Button asChild size="sm" variant="ghost" className="gap-1">
                    <a href={`https://www.strava.com/activities/${r.strava_activity_id}`} target="_blank" rel="noreferrer">
                      Strava <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
