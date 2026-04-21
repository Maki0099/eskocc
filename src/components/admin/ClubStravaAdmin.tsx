import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Loader2, RefreshCw, Link2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";

interface ClubActivity {
  id: string;
  athlete_full: string;
  athlete_firstname: string;
  athlete_lastname_initial: string | null;
  matched_user_id: string | null;
  activity_date: string;
  distance_m: number;
  elevation_gain: number;
  sport_type: string | null;
}

interface AthleteMapping {
  athlete_key: string;
  athlete_firstname: string;
  athlete_lastname_initial: string | null;
  matched_user_id: string | null;
  ignored: boolean;
}

interface AthleteRow extends AthleteMapping {
  activity_count: number;
  total_km: number;
}

interface Member {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

interface Credentials {
  athlete_id: string | null;
  expires_at: string;
  updated_at: string;
  needs_reauth: boolean | null;
  last_error: string | null;
}

interface SyncLogRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  fetched_count: number;
  new_activities: number;
  new_athletes: number;
  ytd_users_updated: number;
  ytd_users_zeroed: number;
  status: string;
  error_message: string | null;
  triggered_by: string | null;
}

const IGNORE_VALUE = "__ignore__";
const NONE_VALUE = "__none__";

interface ClubStravaAdminProps {
  preselectedAthleteKey?: string | null;
  onAthleteSelected?: () => void;
}

export const ClubStravaAdmin = ({ preselectedAthleteKey, onAthleteSelected }: ClubStravaAdminProps) => {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [highlightedAthleteKey, setHighlightedAthleteKey] = useState<string | null>(null);

  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credsRes, actsRes, mapRes, profilesRes, lastSyncRes, logsRes] = await Promise.all([
        supabase
          .from("club_api_credentials")
          .select("athlete_id, expires_at, updated_at, needs_reauth, last_error")
          .maybeSingle(),
        supabase
          .from("club_activities")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("club_athlete_mappings").select("*"),
        supabase.from("profiles").select("id, full_name, nickname"),
        supabase
          .from("club_activities")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("club_sync_log")
          .select("*")
          .order("started_at", { ascending: false })
          .limit(10),
      ]);

      setCreds(credsRes.data);
      const acts = (actsRes.data || []) as ClubActivity[];
      setActivities(acts);
      setMembers(profilesRes.data || []);
      setLastSyncAt(lastSyncRes.data?.created_at || null);
      setSyncLogs((logsRes.data || []) as SyncLogRow[]);

      // Aggregate per-athlete stats from activities
      const stats = new Map<string, { count: number; distM: number }>();
      for (const a of acts) {
        const key = `${a.athlete_firstname.trim().toLowerCase()}|${(a.athlete_lastname_initial || "").trim().toLowerCase()}`;
        const cur = stats.get(key) || { count: 0, distM: 0 };
        cur.count += 1;
        cur.distM += a.distance_m || 0;
        stats.set(key, cur);
      }

      const rows: AthleteRow[] = (mapRes.data || []).map((m: AthleteMapping) => {
        const s = stats.get(m.athlete_key) || { count: 0, distM: 0 };
        return {
          ...m,
          activity_count: s.count,
          total_km: Math.round(s.distM / 1000),
        };
      });
      rows.sort((a, b) => b.activity_count - a.activity_count);
      setAthletes(rows);
    } catch (err: any) {
      toast.error(err.message || "Nepodařilo se načíst data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const params = new URLSearchParams(window.location.search);
    const status = params.get("club_strava");
    if (status === "connected") {
      toast.success("Klubový Strava účet propojen!");
      window.history.replaceState({}, "", "/admin");
      fetchData();
    } else if (status === "error") {
      toast.error(`Propojení selhalo: ${params.get("reason") || "neznámá chyba"}`);
      window.history.replaceState({}, "", "/admin");
    }
  }, []);

  useEffect(() => {
    if (preselectedAthleteKey) {
      setHighlightedAthleteKey(preselectedAthleteKey);
      // Scroll to the highlighted row after a short delay to allow rendering
      setTimeout(() => {
        const element = document.getElementById(`athlete-row-${preselectedAthleteKey}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        onAthleteSelected?.();
      }, 100);
    }
  }, [preselectedAthleteKey, onAthleteSelected]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const redirectUri = `https://${projectId}.supabase.co/functions/v1/club-strava-callback`;
      const returnTo = window.location.origin;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/club-strava-auth?redirect_uri=${encodeURIComponent(redirectUri)}&return_to=${encodeURIComponent(returnTo)}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error(json.error || "Failed to get auth URL");
      }
    } catch (err: any) {
      toast.error(err.message || "Nepodařilo se zahájit propojení");
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-club-activities");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        `Sync hotov: ${data.fetched} aktivit, ${data.matched} spárováno, ${data.new_athletes ?? 0} nových atletů, ${data.users_updated} členů aktualizováno`
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Sync selhal");
    } finally {
      setSyncing(false);
    }
  };

  const handleSelect = async (athleteKey: string, value: string) => {
    setSavingKey(athleteKey);
    try {
      let body: Record<string, unknown>;
      if (value === IGNORE_VALUE) {
        body = { athlete_key: athleteKey, ignored: true, user_id: null };
      } else if (value === NONE_VALUE) {
        body = { athlete_key: athleteKey, ignored: false, user_id: null };
      } else {
        body = { athlete_key: athleteKey, ignored: false, user_id: value };
      }

      const { data, error } = await supabase.functions.invoke("match-club-athlete", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Propojení uloženo. Všechny aktivity atleta byly přepárovány.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Uložení selhalo");
    } finally {
      setSavingKey(null);
    }
  };

  const isConnected = !!creds;
  const needsReauth = !!creds?.needs_reauth;
  const unassigned = athletes.filter((a) => !a.matched_user_id && !a.ignored).length;

  const hoursSinceSync = lastSyncAt
    ? (Date.now() - new Date(lastSyncAt).getTime()) / 3_600_000
    : null;
  const syncStale = hoursSinceSync === null || hoursSinceSync > 24;
  const showStaleAlert = !loading && !needsReauth && syncStale;
  const lastSuccessLog = syncLogs.find((l) => l.status === "success") || null;

  const healthBadge: { label: string; className: string } = needsReauth
    ? { label: "Vyžaduje přepojení", className: "bg-destructive/15 text-destructive border-destructive/30" }
    : syncStale
    ? { label: "Sync zastaralý", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" }
    : { label: "Aktivní", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" };

  const selectValue = (a: AthleteRow): string => {
    if (a.ignored) return IGNORE_VALUE;
    if (a.matched_user_id) return a.matched_user_id;
    return NONE_VALUE;
  };

  return (
    <div className="space-y-6">
      {needsReauth && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Strava token byl odvolán</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Strava odmítla obnovit token (uživatel pravděpodobně odpojil aplikaci, nebo
              vypršel refresh token). Sync je zastaven, dokud nebudeš autorizovat znovu.
            </p>
            {creds?.last_error && (
              <p className="text-xs font-mono opacity-80 break-all">
                Detail: {creds.last_error}
              </p>
            )}
            <Button size="sm" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Přepojit
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {showStaleAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {hoursSinceSync === null
              ? "Sync ještě neproběhl"
              : "Sync neproběhl déle než 24 hodin"}
          </AlertTitle>
          <AlertDescription>
            {hoursSinceSync === null ? (
              <>
                V databázi nejsou žádné synchronizované aktivity. Spusť ručně „Sync teď" a zkontroluj
                logy. Pokud sync selže, zkontroluj propojení Strava účtu níže.
              </>
            ) : (
              <>
                Poslední úspěšný sync proběhl{" "}
                {formatDistanceToNow(new Date(lastSyncAt!), { addSuffix: true, locale: cs })}. Cron
                má běžet každé 4 hodiny — možná problém s tokenem nebo Strava API. Zkus „Sync teď"
                a sleduj výsledek.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Strava klub - propojení
          </CardTitle>
          <CardDescription>
            Centrální přístup k aktivitám klubu ESKO.cc (ID 1860524). Stačí propojit jeden admin
            účet — z něj se čtou všechny klubové aktivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Propojeno</p>
                    <Badge variant="outline" className={healthBadge.className}>
                      {healthBadge.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Athlete ID: {creds.athlete_id || "—"}
                    {lastSuccessLog ? (
                      <>
                        {" "}· Poslední úspěšný sync:{" "}
                        {formatDistanceToNow(new Date(lastSuccessLog.started_at), { addSuffix: true, locale: cs })}
                        {" "}({lastSuccessLog.fetched_count} aktivit)
                      </>
                    ) : lastSyncAt ? (
                      <>
                        {" "}· Poslední aktivita:{" "}
                        {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: cs })}
                      </>
                    ) : (
                      <> · Sync ještě neproběhl</>
                    )}
                    {" "}· Auto-refresh ✓
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Přepojit"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg border border-dashed">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Není propojeno</p>
                  <p className="text-sm text-muted-foreground">
                    Propoj svůj Strava účet (musíš být členem klubu).
                  </p>
                </div>
              </div>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Propojit klubový účet
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium">Manuální sync</p>
              <p className="text-xs text-muted-foreground">
                Cron běží automaticky každé 4 hodiny. Tlačítko spustí sync ihned.
              </p>
            </div>
            <Button onClick={handleSync} disabled={syncing || !isConnected} variant="outline">
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync teď
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Atleti klubu</span>
            <Badge variant="secondary">
              {athletes.length} celkem · {unassigned} nepřiřazených
            </Badge>
          </CardTitle>
          <CardDescription>
            Jedno propojení Strava atleta ↔ člen klubu pokryje všechny jeho minulé i budoucí
            aktivity. „Ignorovat" vyřadí atleta z napárování (např. host).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : athletes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Žádní atleti. Spusť sync.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atlet (Strava)</TableHead>
                    <TableHead className="text-right">Aktivit</TableHead>
                    <TableHead className="text-right">Σ km</TableHead>
                    <TableHead>Spárovaný člen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletes.map((a) => (
                    <TableRow 
                      key={a.athlete_key} 
                      id={`athlete-row-${a.athlete_key}`}
                      className={highlightedAthleteKey === a.athlete_key ? "bg-primary/10 ring-1 ring-primary/30" : ""}
                    >
                      <TableCell className="font-medium">
                        {a.athlete_firstname} {a.athlete_lastname_initial}
                      </TableCell>
                      <TableCell className="text-right">{a.activity_count}</TableCell>
                      <TableCell className="text-right">{a.total_km}</TableCell>
                      <TableCell>
                        <Select
                          value={selectValue(a)}
                          onValueChange={(v) => handleSelect(a.athlete_key, v)}
                          disabled={savingKey === a.athlete_key}
                        >
                          <SelectTrigger className="w-[240px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>— nepřiřazeno —</SelectItem>
                            <SelectItem value={IGNORE_VALUE}>🚫 Ignorovat (host)</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.full_name || m.nickname || m.id.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Poslední aktivity</span>
            <Badge variant="secondary">{activities.length}</Badge>
          </CardTitle>
          <CardDescription>
            Jen pro přehled — párování se řídí výše uvedenou tabulkou atletů.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Žádné aktivity.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atlet</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead className="text-right">Vzdálenost</TableHead>
                    <TableHead className="text-right">Převýšení</TableHead>
                    <TableHead>Datum syncu</TableHead>
                    <TableHead>Stav</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => {
                    const member = members.find((m) => m.id === a.matched_user_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.athlete_full}</TableCell>
                        <TableCell className="text-muted-foreground">{a.sport_type || "—"}</TableCell>
                        <TableCell className="text-right">
                          {(a.distance_m / 1000).toFixed(1)} km
                        </TableCell>
                        <TableCell className="text-right">{a.elevation_gain} m</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(a.activity_date), "d. M. yyyy", { locale: cs })}
                        </TableCell>
                        <TableCell>
                          {member ? (
                            <Badge variant="outline">
                              {member.full_name || member.nickname}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historie syncu</CardTitle>
          <CardDescription>
            Posledních 10 běhů (manuální i automatické). Pomáhá poznat, kdy a proč sync selhal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : syncLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Zatím žádné záznamy.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Spuštěno</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead className="text-right">Načteno</TableHead>
                    <TableHead className="text-right">Nové akt.</TableHead>
                    <TableHead className="text-right">Nový atleti</TableHead>
                    <TableHead className="text-right">YTD upd/zero</TableHead>
                    <TableHead>Spustil</TableHead>
                    <TableHead>Chyba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => {
                    const statusVariant: "default" | "secondary" | "destructive" | "outline" =
                      log.status === "success"
                        ? "outline"
                        : log.status === "running"
                        ? "secondary"
                        : "destructive";
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(log.started_at), "d. M. HH:mm:ss", { locale: cs })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{log.fetched_count}</TableCell>
                        <TableCell className="text-right">{log.new_activities}</TableCell>
                        <TableCell className="text-right">{log.new_athletes}</TableCell>
                        <TableCell className="text-right text-xs">
                          {log.ytd_users_updated} / {log.ytd_users_zeroed}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.triggered_by || "—"}
                        </TableCell>
                        <TableCell
                          className="text-xs text-destructive max-w-[280px] truncate"
                          title={log.error_message || ""}
                        >
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
