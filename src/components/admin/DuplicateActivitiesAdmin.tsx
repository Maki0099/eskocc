import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CopyCheck, RefreshCw, Undo2, Mountain, Timer, Route as RouteIcon } from "lucide-react";

interface DuplicatePair {
  a_id: string;
  b_id: string;
  athlete_full: string;
  matched_user_id: string | null;
  a_distance_m: number;
  b_distance_m: number;
  a_moving_time: number;
  b_moving_time: number;
  a_elevation: number;
  b_elevation: number;
  a_sport_type: string | null;
  b_sport_type: string | null;
  a_date: string;
  b_date: string;
  a_excluded: boolean;
  b_excluded: boolean;
  likely_duplicate: boolean;
}

const formatKm = (m: number) => `${(m / 1000).toFixed(2)} km`;
const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const min = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h ${min} min` : `${min} min`;
};
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

export const DuplicateActivitiesAdmin = () => {
  const { toast } = useToast();
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_duplicate_activity_candidates" as any);
    if (error) {
      toast({
        title: "Nepodařilo se načíst podezřelé jízdy",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const rows = (data as unknown as DuplicatePair[]) ?? [];
      rows.sort((x, y) => Number(y.likely_duplicate) - Number(x.likely_duplicate));
      setPairs(rows);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (activityId: string, excluded: boolean) => {
    setBusyId(activityId);
    const { error } = await supabase.rpc("set_activity_duplicate" as any, {
      _id: activityId,
      _excluded: excluded,
    });
    setBusyId(null);
    if (error) {
      toast({ title: "Změna se nezdařila", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: excluded ? "Jízda označena jako duplicita" : "Jízda se opět počítá",
      description: "Statistiky byly přepočítány.",
    });
    load();
  };

  const renderRide = (
    id: string,
    distance: number,
    time: number,
    elevation: number,
    sport: string | null,
    date: string,
    excluded: boolean
  ) => (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
        excluded ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"
      }`}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-medium">
            <RouteIcon className="h-3.5 w-3.5" />
            {formatKm(distance)}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            {formatTime(time)}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Mountain className="h-3.5 w-3.5" />
            {elevation.toLocaleString("cs-CZ")} m
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {sport || "Ride"} · načteno {formatDate(date)}
          {excluded && " · nepočítá se"}
        </p>
      </div>
      {excluded ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busyId === id}
          onClick={() => toggle(id, false)}
          className="gap-2"
        >
          <Undo2 className="h-4 w-4" />
          Přece jen počítat
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          disabled={busyId === id}
          onClick={() => toggle(id, true)}
          className="gap-2"
        >
          <CopyCheck className="h-4 w-4" />
          Označit jako duplicitu
        </Button>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CopyCheck className="h-5 w-5" />
            Možné duplicitní jízdy
          </CardTitle>
          <CardDescription>
            Jízdy stejného jezdce synchronizované ve stejný den — typické pro nahrání stejné trasy
            ze dvou zařízení (např. hodinky + cyklopočítač) v jedné dávce. Jako pravděpodobná
            duplicita se označí dvojice se shodnou vzdáleností (do 500 m), časem jízdy (do 6 min)
            i převýšením (do 30 m nebo 10 %). Označená jízda se přestane počítat do statistik,
            ale zůstane uložená.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Obnovit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : pairs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Žádné podezřelé dvojice jsme nenašli.
          </p>
        ) : (
          pairs.map((p) => {
            const distDiff = Math.abs(p.a_distance_m - p.b_distance_m);
            const timeDiff = Math.abs(p.a_moving_time - p.b_moving_time);
            const elevDiff = Math.abs((p.a_elevation ?? 0) - (p.b_elevation ?? 0));
            return (
              <div key={`${p.a_id}-${p.b_id}`} className="space-y-2 rounded-2xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{p.athlete_full}</span>
                  {p.likely_duplicate && (
                    <Badge variant="destructive" className="text-xs">
                      Pravděpodobná duplicita
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    rozdíl {distDiff} m · {timeDiff} s · {elevDiff} m převýšení
                  </Badge>
                </div>
                {renderRide(
                  p.a_id,
                  p.a_distance_m,
                  p.a_moving_time,
                  p.a_elevation,
                  p.a_sport_type,
                  p.a_date,
                  p.a_excluded
                )}
                {renderRide(
                  p.b_id,
                  p.b_distance_m,
                  p.b_moving_time,
                  p.b_elevation,
                  p.b_sport_type,
                  p.b_date,
                  p.b_excluded
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
