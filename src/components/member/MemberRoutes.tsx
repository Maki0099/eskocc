import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Bike, Download, Mountain, Route as RouteIcon, Clock, Maximize2, Info } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  coordsToGpx,
  decodePolyline,
  downloadGpx,
  downsample,
  encodePolyline,
  slugifyFileName,
  type LngLat,
} from "@/lib/polyline";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

const PAGE_SIZE = 20;

interface MemberRoute {
  id: string;
  name: string | null;
  activity_date: string;
  distance_m: number;
  moving_time: number;
  elevation_gain: number;
  sport_type: string | null;
  map_polyline: string | null;
}

interface Props {
  userId: string;
}

const staticMapUrl = (coords: LngLat[], width = 400, height = 200) => {
  const encoded = encodeURIComponent(encodePolyline(downsample(coords, 80)));
  const path = `path-3+7A6855-0.9(${encoded})`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/` +
    `${path}/auto/${width}x${height}@2x?padding=20&access_token=${MAPBOX_TOKEN}`
  );
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m} min`;
};

function RouteDetailMap({ coords }: { coords: LngLat[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || coords.length < 2) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      bounds: [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      fitBoundsOptions: { padding: 40 },
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#7A6855", "line-width": 4 },
      });
      new mapboxgl.Marker({ color: "#22c55e", scale: 0.8 })
        .setLngLat(coords[0])
        .addTo(map);
      new mapboxgl.Marker({ color: "#ef4444", scale: 0.8 })
        .setLngLat(coords[coords.length - 1])
        .addTo(map);
      map.resize();
    });

    return () => map.remove();
  }, [coords]);

  return <div ref={container} className="w-full h-full" />;
}

const MemberRoutes = ({ userId }: Props) => {
  const [routes, setRoutes] = useState<MemberRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<MemberRoute | null>(null);

  const fetchPage = async (offset: number) => {
    const { data, error: rpcError } = await supabase.rpc("get_member_routes" as any, {
      _user_id: userId,
      _limit: PAGE_SIZE,
      _offset: offset,
    });
    if (rpcError) throw rpcError;
    return (data ?? []) as MemberRoute[];
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchPage(0)
      .then((rows) => {
        if (cancelled) return;
        setRoutes(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const rows = await fetchPage(routes.length);
      setRoutes((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      toast.error("Další trasy se nepodařilo načíst");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDownload = (route: MemberRoute) => {
    if (!route.map_polyline) return;
    const coords = decodePolyline(route.map_polyline);
    if (coords.length < 2) {
      toast.error("Trasa neobsahuje dostatek bodů");
      return;
    }
    const name = route.name || "Jízda";
    const gpx = coordsToGpx(coords, name, route.activity_date);
    downloadGpx(
      gpx,
      `${slugifyFileName(name)}-${format(new Date(route.activity_date), "yyyy-MM-dd")}.gpx`
    );
    toast.success("GPX staženo");
  };

  const detailCoords = useMemo(
    () => (detail?.map_polyline ? decodePolyline(detail.map_polyline) : []),
    [detail]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-primary" />
          Trasy
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Venkovní jízdy na kole – stáhni si trasu jako GPX a nahraj ji do Garminu.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Info className="w-4 h-4" />
              Jak dostat trasu do Garminu?
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ol className="text-sm text-muted-foreground space-y-1 pl-5 list-decimal">
              <li>Klikni na <strong>Stáhnout GPX</strong> u vybrané trasy.</li>
              <li>Otevři Garmin Connect (web nebo mobil).</li>
              <li>
                Přejdi na <strong>Tréninky a plánování → Trasy → Importovat</strong> a vyber
                stažený soubor.
              </li>
              <li>
                U trasy zvol <strong>Odeslat do zařízení</strong> – po synchronizaci ji najdeš
                v navigaci hodinek nebo cyklopočítače.
              </li>
            </ol>
          </CollapsibleContent>
        </Collapsible>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Trasy se nepodařilo načíst. Zkontroluj připojení k internetu.
          </p>
        ) : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Zatím tu nejsou žádné venkovní jízdy se záznamem trasy.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {routes.map((route) => {
                const coords = route.map_polyline ? decodePolyline(route.map_polyline) : [];
                return (
                  <div
                    key={route.id}
                    className="rounded-lg border border-border overflow-hidden bg-card"
                  >
                    <button
                      type="button"
                      onClick={() => setDetail(route)}
                      className="relative block w-full h-[140px] bg-muted"
                      aria-label={`Zobrazit trasu ${route.name || "jízda"}`}
                    >
                      {coords.length > 1 && (
                        <img
                          src={staticMapUrl(coords)}
                          alt={`Mapa trasy ${route.name || "jízda"}`}
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
                      <div className="min-w-0">
                        <p className="font-medium truncate">{route.name || "Jízda"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(route.activity_date), "d. MMMM yyyy", { locale: cs })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bike className="w-3.5 h-3.5" />
                          {(route.distance_m / 1000).toFixed(1)} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Mountain className="w-3.5 h-3.5" />
                          {route.elevation_gain} m
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(route.moving_time)}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => handleDownload(route)}
                      >
                        <Download className="w-4 h-4" />
                        Stáhnout GPX
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Načítám…" : "Načíst další"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detail?.name || "Trasa"}</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh] rounded-lg overflow-hidden">
            {detailCoords.length > 1 && <RouteDetailMap coords={detailCoords} />}
          </div>
          {detail && (
            <Button className="gap-2" onClick={() => handleDownload(detail)}>
              <Download className="w-4 h-4" />
              Stáhnout GPX
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MemberRoutes;
