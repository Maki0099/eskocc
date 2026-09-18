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
import { MapPin, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const MAPBOX_TOKEN = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";
const CLUB_CENTER: [number, number] = [18.2401, 49.3513];

interface StartPoint {
  user_id: string;
  full_name: string | null;
  start_lat: number;
  start_lng: number;
  activity_date: string;
  distance_m: number;
}

type Period = 30 | 90 | 365;

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: 30, label: "30 dní" },
  { value: 90, label: "90 dní" },
  { value: 365, label: "Rok" },
];

const ClubMap = () => {
  const { isMember, loading: roleLoading } = useUserRole();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [period, setPeriod] = useState<Period>(90);
  const [points, setPoints] = useState<StartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMember) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_club_activity_starts" as any, { _days: period });
      if (!active) return;
      setPoints((data as any as StartPoint[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [period, isMember]);

  useEffect(() => {
    if (!isMember || !mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: CLUB_CENTER,
        zoom: 9,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.current.on("load", () => {
        // Recalculate size in case the container was laid out after init
        map.current?.resize();
      });

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setMapError("Nepodařilo se načíst mapu");
      });
    } catch (e) {
      console.error("Map initialization error:", e);
      setMapError("Nepodařilo se inicializovat mapu");
    }

    return () => {
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

    const addMarkers = () => {
      points.forEach((p) => {
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#7A6855";
        el.style.border = "2px solid #fff";
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([Number(p.start_lng), Number(p.start_lat)])
          .setPopup(
            new mapboxgl.Popup({ offset: 12, focusAfterOpen: false }).setHTML(`
              <div style="padding: 6px;">
                <strong style="font-size: 13px;">${p.full_name || "Člen klubu"}</strong>
                <p style="margin: 2px 0 0; font-size: 12px; color: #666;">
                  ${(p.distance_m / 1000).toLocaleString("cs-CZ")} km · ${format(new Date(p.activity_date), "d. M. yyyy", { locale: cs })}
                </p>
              </div>
            `)
          )
          .addTo(map.current!);
        markers.current.push(marker);
      });
    };

    if (map.current.loaded()) {
      addMarkers();
    } else {
      map.current.once("load", addMarkers);
    }
  }, [points]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Mapa klubu | ESKO.cc"
        description="Mapa startovních bodů jízd členů cyklistického klubu ESKO.cc."
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
              Startovní body jízd členů s propojenou Stravou
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
                      <div ref={mapContainer} className="absolute inset-0" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <p className="text-center text-sm text-muted-foreground">
                {loading
                  ? "Načítám jízdy…"
                  : points.length === 0
                    ? "Za zvolené období nejsou k dispozici žádné jízdy s polohou startu."
                    : `${points.length} jízd za posledních ${period} dní`}
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClubMap;
