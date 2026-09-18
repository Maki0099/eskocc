import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ConnectionRow {
  user_id: string;
  full_name: string | null;
  athlete_id: string | null;
  needs_reauth: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  activities_count: number;
}

export const MemberStravaAdmin = () => {
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_member_strava_connections" as any);
    if (error) {
      toast.error("Nepodařilo se načíst přehled propojení");
    } else {
      setRows((data as unknown as ConnectionRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-member-activities", {
        body: {},
      });
      if (error) throw error;
      const res = data as { processed: number; ok: number; users_updated: number };
      toast.success(
        `Staženo pro ${res.ok} z ${res.processed} propojených účtů, přepočteno ${res.users_updated} členů.`
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const connected = rows.filter((r) => r.athlete_id && !r.needs_reauth).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Strava členů
          </CardTitle>
          <Button onClick={runSync} disabled={syncing} variant="outline" className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Stáhnout jízdy teď
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Propojeno {connected} z {rows.length} členů. Data se stahují z osobních účtů členů,
          klubové rozhraní Strava k 1. 9. 2026 zrušila. Historická klubová data zůstávají uložena.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.user_id}
                className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{r.full_name || "Bez jména"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.athlete_id ? (
                      <>
                        {r.activities_count} jízd letos
                        {r.last_synced_at && (
                          <> · staženo {new Date(r.last_synced_at).toLocaleString("cs-CZ")}</>
                        )}
                      </>
                    ) : (
                      "Účet zatím nepropojen"
                    )}
                  </p>
                  {r.last_error && (
                    <p className="text-xs text-destructive mt-0.5 truncate">{r.last_error}</p>
                  )}
                </div>
                {!r.athlete_id ? (
                  <Badge variant="outline">Nepropojeno</Badge>
                ) : r.needs_reauth ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Vypršelo
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Propojeno
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberStravaAdmin;
