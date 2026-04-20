import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Activity, Loader2, RefreshCw, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

interface Member {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

interface Credentials {
  athlete_id: string | null;
  expires_at: string;
  updated_at: string;
}

export const ClubStravaAdmin = () => {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [credsRes, actsRes, profilesRes] = await Promise.all([
        supabase.from("club_api_credentials").select("athlete_id, expires_at, updated_at").maybeSingle(),
        supabase
          .from("club_activities")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("id, full_name, nickname"),
      ]);

      setCreds(credsRes.data);
      setActivities(actsRes.data || []);
      setMembers(profilesRes.data || []);
    } catch (err: any) {
      toast.error(err.message || "Nepodařilo se načíst data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Handle OAuth callback
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

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const redirectUri = `https://${projectId}.supabase.co/functions/v1/club-strava-callback`;

      const { data, error } = await supabase.functions.invoke("club-strava-auth", {
        body: { redirect_uri: redirectUri },
        method: "POST",
      });

      // The function uses query params, so call directly
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/club-strava-auth?redirect_uri=${encodeURIComponent(redirectUri)}`,
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
        `Sync hotov: ${data.fetched} aktivit, ${data.matched} spárováno, ${data.users_updated} uživatelů aktualizováno`
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Sync selhal");
    } finally {
      setSyncing(false);
    }
  };

  const handleMatch = async (activityId: string, userId: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke("match-club-activity", {
        body: { activity_id: activityId, user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Aktivita přiřazena");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Přiřazení selhalo");
    }
  };

  const isConnected = !!creds;
  const unmatched = activities.filter((a) => !a.matched_user_id);

  return (
    <div className="space-y-6">
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
                <div>
                  <p className="font-medium">Propojeno</p>
                  <p className="text-sm text-muted-foreground">
                    Athlete ID: {creds.athlete_id || "—"} · Token expiruje{" "}
                    {format(new Date(creds.expires_at), "d. M. yyyy HH:mm", { locale: cs })}
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
                Cron běží automaticky každou hodinu. Tlačítko spustí sync ihned.
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
            <span>Klubové aktivity</span>
            <Badge variant="secondary">
              {activities.length} celkem · {unmatched.length} nepárovaných
            </Badge>
          </CardTitle>
          <CardDescription>
            Posledních 100 aktivit. U nepárovaných můžeš ručně přiřadit uživatele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Žádné aktivity. Spusť sync.
            </p>
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
                    <TableHead>Spárovaný uživatel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
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
                        <Select
                          value={a.matched_user_id || "none"}
                          onValueChange={(v) => handleMatch(a.id, v === "none" ? null : v)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— nepřiřazeno —</SelectItem>
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
    </div>
  );
};
