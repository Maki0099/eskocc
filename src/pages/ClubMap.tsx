import Seo from "@/components/Seo";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, Download } from "lucide-react";
import { decodePolyline } from "@/lib/polyline";
import { Link } from "react-router-dom";
import { ROUTES, getMemberProfilePath } from "@/lib/routes";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import RouteDetailDialog, {
  downloadRouteGpx,
  formatDuration,
} from "@/components/member/RouteDetailDialog";

const MAPBOX_TOKEN = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";
const CLUB_CENTER: [number, number] = [18.2401, 49.3513];

interface ActivityLine {
  id: string;
  user_id: string;
  full_name: string | null;
  name: string | null;
  activity_date: string;
  distance_km: number;
  elevation_gain: number | null;
  moving_time: number | null;
  start_lat: number | null;
  start_lng: number | null;
  map_polyline: string | null;
  is_virtual: boolean | null;
}

type Period = 30 | 90 | 365;
type RideKind = "all" | "outdoor" | "virtual";

const OUTDOOR_COLOR = "#7A6855";
const VIRTUAL_COLOR = "#3B82F6";
const SELECTED_WIDTH = 5;

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: 30, label: "30 dní" },
  { value: 90, label: "90 dní" },
  { value: 365, label: "Rok" },
];

const KIND_LABELS: { value: RideKind; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "outdoor", label: "Venku" },
  { value: "virtual", label: "Virtuální" },
];


const ClubMap = () => {
  const { isMember, loading: roleLoading } = useUserRole();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [period, setPeriod] = useState<Period>(90);
  const [rideKind, setRideKind] = useState<RideKind>("all");
  const [activities, setActivities] = useState<ActivityLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!isMember) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (!active) return;
        setLoadError("Vypadá to, že nejsi online. Data jízd se nepodařilo načíst.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_club_activity_polylines" as any, { _days: period });
      if (!active) return;
      if (error) {
        setLoadError("Data se nepodařilo načíst. Zkontroluj připojení k internetu.");
        setActivities([]);
      } else {
        setActivities((data as any as ActivityLine[]) || []);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [period, isMember, reloadKey]);

  useEffect(() => {
    if (!isMember || !mapContainer.current || map.current) return;

    const container = mapContainer.current;
    let resizeObserver: ResizeObserver | null = null;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/light-v11",
        center: CLUB_CENTER,
        zoom: 9,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.current.on("load", () => {
        const m = map.current;
        if (!m) return;
        m.resize();
        m.addSource("route-lines", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          lineMetrics: true,
          promoteId: "activityId",
        });
        m.addLayer({
          id: "route-lines-layer",
          type: "line",
          source: "route-lines",
          filter: ["!=", ["get", "isVirtual"], true],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": OUTDOOR_COLOR,
            "line-width": 2,
            "line-opacity": 0.55,
          },
        });
        m.addLayer({
          id: "route-lines-virtual-layer",
          type: "line",
          source: "route-lines",
          filter: ["==", ["get", "isVirtual"], true],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": VIRTUAL_COLOR,
            "line-width": 2,
            "line-opacity": 0.6,
            "line-dasharray": [2, 2],
          },
        });
        // Wide invisible hit layer so thin lines are easy to click
        m.addLayer({
          id: "route-lines-hit-layer",
          type: "line",
          source: "route-lines",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "rgba(0,0,0,0)",
            "line-width": 14,
          },
        });
        // Highlight layer for the selected route
        m.addLayer({
          id: "route-lines-selected-layer",
          type: "line",
          source: "route-lines",
          filter: ["==", ["get", "activityId"], ""],
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "isVirtual"], true],
              VIRTUAL_COLOR,
              OUTDOOR_COLOR,
            ],
            "line-width": SELECTED_WIDTH,
            "line-opacity": 1,
          },
        });

        m.on("click", "route-lines-hit-layer", (e) => {
          const id = e.features?.[0]?.properties?.activityId as string | undefined;
          if (id) setSelectedId(id);
        });
        m.on("mouseenter", "route-lines-hit-layer", () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", "route-lines-hit-layer", () => {
          m.getCanvas().style.cursor = "";
        });
        m.on("click", (e) => {
          const hits = m.queryRenderedFeatures(e.point, { layers: ["route-lines-hit-layer"] });
          if (hits.length === 0) setSelectedId(null);
        });

        setMapReady(true);
      });

      resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(() => map.current?.resize());
      });
      resizeObserver.observe(container);

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setMapError("Nepodařilo se načíst mapu");
      });
    } catch (e) {
      console.error("Map initialization error:", e);
      setMapError("Nepodařilo se inicializovat mapu");
    }

    return () => {
      resizeObserver?.disconnect();
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [isMember]);

  const virtualCount = activities.filter((a) => a.is_virtual === true).length;
  const outdoorCount = activities.length - virtualCount;
  const visibleActivities = useMemo(() => {
    if (rideKind === "virtual") return activities.filter((a) => a.is_virtual === true);
    if (rideKind === "outdoor") return activities.filter((a) => a.is_virtual !== true);
    return activities;
  }, [activities, rideKind]);

  const selectedActivity = useMemo(
    () => visibleActivities.find((a) => a.id === selectedId) ?? null,
    [visibleActivities, selectedId]
  );

  useEffect(() => {
    if (!map.current || !mapReady) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const updateLayers = () => {
      const m = map.current;
      if (!m) return;

      const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

      visibleActivities.forEach((a) => {
        const isVirtual = a.is_virtual === true;
        if (a.map_polyline) {
          const coords = decodePolyline(a.map_polyline);
          if (coords.length >= 2) {
            features.push({
              type: "Feature",
              properties: {
                activityId: a.id,
                name: a.full_name || "Člen klubu",
                distance: a.distance_km,
                date: a.activity_date,
                isVirtual,
              },
              geometry: {
                type: "LineString",
                coordinates: coords,
              },
            });
          }
        }

        if (a.start_lat != null && a.start_lng != null) {
          const el = document.createElement("div");
          el.style.width = "12px";
          el.style.height = "12px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = isVirtual ? VIRTUAL_COLOR : OUTDOOR_COLOR;
          el.style.border = "2px solid #fff";
          el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
          el.style.cursor = "pointer";
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            setSelectedId(a.id);
          });

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([Number(a.start_lng), Number(a.start_lat)])
            .setPopup(
              new mapboxgl.Popup({ offset: 12, focusAfterOpen: false }).setHTML(`
                <div style="padding: 6px;">
                  <strong style="font-size: 13px;">${a.full_name || "Člen klubu"}</strong>
                  <p style="margin: 2px 0 0; font-size: 12px; color: #666;">
                    ${Number(a.distance_km).toLocaleString("cs-CZ")} km · ${format(new Date(a.activity_date), "d. M. yyyy", { locale: cs })}
                  </p>
                  ${isVirtual ? `<p style="margin: 4px 0 0; font-size: 11px; color: ${VIRTUAL_COLOR};">Virtuální jízda (Zwift / ROUVY)</p>` : ""}
                </div>
              `)
            )
            .addTo(m);
          markers.current.push(marker);
        }
      });

      const source = m.getSource("route-lines") as mapboxgl.GeoJSONSource | undefined;
      source?.setData({
        type: "FeatureCollection",
        features,
      });
    };

    updateLayers();
  }, [visibleActivities, mapReady]);

  // Highlight the selected route, dim the rest
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const applySelection = () => {
      if (!m.getLayer("route-lines-selected-layer")) return;
      m.setFilter("route-lines-selected-layer", [
        "==",
        ["get", "activityId"],
        selectedId ?? "",
      ]);
      const dimmed = selectedId ? 0.12 : null;
      if (m.getLayer("route-lines-layer")) {
        m.setPaintProperty("route-lines-layer", "line-opacity", dimmed ?? 0.55);
      }
      if (m.getLayer("route-lines-virtual-layer")) {
        m.setPaintProperty("route-lines-virtual-layer", "line-opacity", dimmed ?? 0.6);
      }
      markers.current.forEach((marker) => {
        marker.getElement().style.opacity = selectedId ? "0.35" : "1";
      });
    };

    if (m.getSource("route-lines")) {
      applySelection();
    }
  }, [selectedId, visibleActivities, mapReady]);

  const hasData = visibleActivities.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Mapa klubu | ESKO.cc"
        description="Mapa startovních bodů a tras jízd členů cyklistického klubu ESKO.cc."
        path="/mapa-klubu"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <Link
            to={ROUTES.STATISTICS}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zpět na statistiky
          </Link>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Kde jezdíme</span>
            </div>
            <h1 className="text-display font-bold">Mapa klubu</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Startovní body a trasy jízd členů s propojenou Stravou
            </p>
          </div>

          {!isMember && !roleLoading ? (
            <MemberOnlyContent
              title="Mapa pro členy"
              description="Pro zobrazení mapy jízd klubu se staň členem."
            />
          ) : (
            <>
              <div className="flex justify-center">
                <div className="inline-flex rounded-lg bg-muted p-0.5">
                  {PERIOD_LABELS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPeriod(p.value)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        period === p.value
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <div className="inline-flex rounded-lg bg-muted p-0.5">
                  {KIND_LABELS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => setRideKind(k.value)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        rideKind === k.value
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="h-[60vh] min-h-[400px] relative">
                    {mapError ? (
                      <div className="absolute inset-0 bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">{mapError}</p>
                      </div>
                    ) : (
                      <div ref={mapContainer} className="h-full w-full" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedActivity ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {selectedActivity.name || "Jízda"}
                        </p>
                        <Link
                          to={getMemberProfilePath(selectedActivity.user_id)}
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedActivity.full_name || "Člen klubu"}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(selectedActivity.activity_date), "d. MMMM yyyy", {
                            locale: cs,
                          })}
                          {" · "}
                          {Number(selectedActivity.distance_km).toLocaleString("cs-CZ")} km
                          {selectedActivity.elevation_gain != null &&
                            ` · ${selectedActivity.elevation_gain} m`}
                          {selectedActivity.moving_time
                            ? ` · ${formatDuration(selectedActivity.moving_time)}`
                            : ""}
                          {selectedActivity.is_virtual ? " · virtuální jízda" : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                        Zrušit výběr
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => setDetailOpen(true)}
                        disabled={!selectedActivity.map_polyline}
                      >
                        <MapPin className="w-4 h-4" />
                        Zobrazit trasu
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => downloadRouteGpx(selectedActivity)}
                        disabled={!selectedActivity.map_polyline}
                      >
                        <Download className="w-4 h-4" />
                        Stáhnout GPX
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                hasData && (
                  <p className="text-center text-sm text-muted-foreground">
                    Klikni na trasu nebo startovní bod – zvýrazní se a zobrazí se její detail.
                  </p>
                )
              )}

              <RouteDetailDialog
                route={detailOpen ? selectedActivity : null}
                onOpenChange={(open) => !open && setDetailOpen(false)}
              />

              {loadError ? (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                  <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                    Zkusit znovu
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border-2 border-background shadow"
                        style={{ backgroundColor: OUTDOOR_COLOR }}
                      />
                      Venku ({outdoorCount})
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border-2 border-background shadow"
                        style={{ backgroundColor: VIRTUAL_COLOR }}
                      />
                      Virtuální — Zwift / ROUVY ({virtualCount})
                    </span>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {loading
                      ? "Načítám jízdy…"
                      : hasData
                        ? `${visibleActivities.length} jízd za posledních ${period} dní · polyliny se zobrazí, pokud je Strava poskytla`
                        : "Za zvolené období nejsou k dispozici žádné jízdy s polohou."}
                  </p>
                  <p className="text-center text-xs text-muted-foreground max-w-xl mx-auto">
                    Virtuální jízdy posílají souřadnice herní trasy (Skotsko, Mallorca, Nový Zéland…), proto se
                    objevují po celém světě, i když se jelo doma na trenažéru.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClubMap;
