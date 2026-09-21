import Seo from "@/components/Seo";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const MAPBOX_TOKEN = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";
const CLUB_CENTER: [number, number] = [18.2401, 49.3513];

interface ActivityLine {
  user_id: string;
  full_name: string | null;
  activity_date: string;
  distance_km: number;
  start_lat: number | null;
  start_lng: number | null;
  map_polyline: string | null;
  is_virtual: boolean | null;
}

type Period = 30 | 90 | 365;
type RideKind = "all" | "outdoor" | "virtual";

const OUTDOOR_COLOR = "#7A6855";
const VIRTUAL_COLOR = "#3B82F6";

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

function decodePolyline(encoded: string): [number, number][] {
  const len = encoded.length;
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
    };
  }, [isMember]);

  useEffect(() => {
    if (!map.current) return;
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

    if (map.current.loaded()) {
      updateLayers();
    } else {
      map.current.once("load", updateLayers);
    }
  }, [visibleActivities]);

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

              {loadError ? (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                  <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                    Zkusit znovu
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {loading
                    ? "Načítám jízdy…"
                    : hasData
                      ? `${activities.length} jízd za posledních ${period} dní · polyliny se zobrazí, pokud je Strava poskytla`
                      : "Za zvolené období nejsou k dispozici žádné jízdy s polohou."}
                </p>
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
