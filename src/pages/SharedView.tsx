import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bike, Clock, Download, Heart, Maximize2, Mountain, Share2, Zap } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/user-utils";
import { decodePolyline, downsample, encodePolyline, type LngLat } from "@/lib/polyline";
import RouteDetailDialog, {
  downloadRouteGpx,
  formatDuration,
  MAPBOX_TOKEN,
} from "@/components/member/RouteDetailDialog";
import logoRound from "@/assets/logo-round-dark.png";

interface SharedPayload {
  kind: "profile" | "activity";
  include_biometrics: boolean;
  owner_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  ytd_distance: number;
  ytd_elevation: number;
  ytd_count: number;
  activity_id: string | null;
}

interface SharedActivity {
  id: string;
  name: string | null;
  activity_date: string;
  distance_m: number;
  moving_time: number;
  elevation_gain: number;
  sport_type: string | null;
  map_polyline: string | null;
  average_speed: number | null;
  average_heartrate: number | null;
  average_watts: number | null;
}

const staticMapUrl = (coords: LngLat[], width = 400, height = 200) => {
  const encoded = encodeURIComponent(encodePolyline(downsample(coords, 80)));
  return (
    `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/` +
    `path-3+7A6855-0.9(${encoded})/auto/${width}x${height}@2x?padding=20&access_token=${MAPBOX_TOKEN}`
  );
};

const toDetailData = (a: SharedActivity) => ({
  name: a.name,
  activity_date: a.activity_date,
  map_polyline: a.map_polyline,
  distance_km: a.distance_m / 1000,
  elevation_gain: a.elevation_gain,
  moving_time: a.moving_time,
});

const SharedView = () => {
  const { token } = useParams<{ token: string }>();
  const [payload, setPayload] = useState<SharedPayload | null>(null);
  const [activities, setActivities] = useState<SharedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [detail, setDetail] = useState<SharedActivity | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data: payloadRows, error } = await supabase.rpc("get_shared_payload" as any, {
        _token: token,
      });
      if (cancelled) return;
      const info = (payloadRows as any as SharedPayload[])?.[0];
      if (error || !info) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      setPayload(info);

      const { data: acts } = await supabase.rpc("get_shared_activities" as any, {
        _token: token,
        _limit: info.kind === "activity" ? 1 : 30,
        _offset: 0,
      });
      if (cancelled) return;
      setActivities((acts as any as SharedActivity[]) ?? []);
      setLoading(false);
      supabase.rpc("register_share_view" as any, { _token: token });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const displayName = payload?.full_name || payload?.nickname || "Člen klubu";
  const single = payload?.kind === "activity" ? activities[0] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title={
          single
            ? `${single.name || "Jízda"} – ${displayName} | ESKO.cc`
            : `${displayName} | ESKO.cc`
        }
        description={
          single
            ? `${(single.distance_m / 1000).toFixed(1)} km, ${single.elevation_gain} m převýšení – sdílená jízda z klubu ESKO.cc.`
            : `Sdílené jízdy člena cyklistického klubu ESKO.cc.`
        }
        noindex
      />

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoRound} alt="ESKO.cc" className="h-9 w-9" />
            <span className="font-bold text-lg">ESKO.cc</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Chceš jezdit s námi?
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </>
        ) : invalid || !payload ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <h1 className="text-xl font-semibold">Odkaz už neplatí</h1>
              <p className="text-muted-foreground">
                Sdílení bylo zrušeno nebo je adresa nesprávná.
              </p>
              <Link to="/">
                <Button variant="outline">Přejít na ESKO.cc</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {payload.avatar_url && <AvatarImage src={payload.avatar_url} alt={displayName} />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(payload.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h1 className="text-xl font-bold">{displayName}</h1>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <Share2 className="w-3 h-3" />
                    {payload.kind === "profile"
                      ? "Sdílený profil člena klubu ESKO.cc"
                      : "Sdílená trasa z klubu ESKO.cc"}
                  </p>
                  {payload.kind === "profile" && (
                    <p className="text-sm text-muted-foreground">
                      {payload.ytd_distance.toLocaleString("cs-CZ")} km ·{" "}
                      {payload.ytd_elevation.toLocaleString("cs-CZ")} m · {payload.ytd_count} jízd
                      letos
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {activities.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Zatím tu nejsou žádné jízdy se záznamem trasy.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activities.map((a) => {
                  const coords = a.map_polyline ? decodePolyline(a.map_polyline) : [];
                  return (
                    <div key={a.id} className="rounded-lg border border-border overflow-hidden bg-card">
                      <button
                        type="button"
                        onClick={() => setDetail(a)}
                        className="relative block w-full h-[140px] bg-muted"
                        aria-label={`Zobrazit trasu ${a.name || "jízda"}`}
                      >
                        {coords.length > 1 && (
                          <img
                            src={staticMapUrl(coords)}
                            alt={`Mapa trasy ${a.name || "jízda"}`}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                        <span className="absolute bottom-1 right-1 rounded bg-background/80 p-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </button>
                      <div className="p-3 space-y-2">
                        <p className="font-medium truncate">{a.name || "Jízda"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(a.activity_date), "d. MMMM yyyy", { locale: cs })}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bike className="w-3.5 h-3.5" />
                            {(a.distance_m / 1000).toFixed(1)} km
                          </span>
                          <span className="flex items-center gap-1">
                            <Mountain className="w-3.5 h-3.5" />
                            {a.elevation_gain} m
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(a.moving_time)}
                          </span>
                          {a.average_heartrate != null && (
                            <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" />
                              {Math.round(Number(a.average_heartrate))} tep/min
                            </span>
                          )}
                          {a.average_watts != null && (
                            <span className="flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5" />
                              {Math.round(Number(a.average_watts))} W
                            </span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => downloadRouteGpx(toDetailData(a))}
                        >
                          <Download className="w-4 h-4" />
                          Stáhnout GPX
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Jak dostat trasu do Garminu?</p>
              <ol className="space-y-1 pl-5 list-decimal">
                <li>Klikni na <strong>Stáhnout GPX</strong> u vybrané trasy.</li>
                <li>Otevři Garmin Connect (web nebo mobil).</li>
                <li>
                  Přejdi na <strong>Tréninky a plánování → Trasy → Importovat</strong> a vyber
                  stažený soubor.
                </li>
                <li>
                  U trasy zvol <strong>Odeslat do zařízení</strong>.
                </li>
              </ol>
            </div>
          </>
        )}
      </main>

      <RouteDetailDialog
        route={detail ? toDetailData(detail) : null}
        onOpenChange={(open) => !open && setDetail(null)}
      />
    </div>
  );
};

export default SharedView;
