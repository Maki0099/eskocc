import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Seo from "@/components/Seo";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bike, Mountain, Sun, ArrowRight, X } from "lucide-react";
import { MAPBOX_TOKEN } from "@/components/member/RouteDetailDialog";
import {
  DIFFICULTY_LABEL, ROUTE_COLORS, TERRAIN_LABEL, campFileUrl, parseGpxCoords, type CampRoute,
} from "@/lib/camp-routes";
import { getCampRoutePath } from "@/lib/routes";

type Line = { route: CampRoute; coords: [number, number][]; color: string };

export const useCampRoutes = (enabled: boolean) =>
  useQuery({
    queryKey: ["camp-routes"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camp_routes").select("*").eq("is_published", true)
        .order("sort_order").order("created_at");
      if (error) throw error;
      return data as CampRoute[];
    },
  });

const CampRoutes = () => {
  const { isMember, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { data: routes = [], isLoading } = useCampRoutes(isMember);
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!routes.length) return;
    let active = true;
    Promise.all(
      routes.map(async (r, i) => {
        try {
          const txt = await (await fetch(campFileUrl(r.gpx_path, r.updated_at))).text();
          return { route: r, coords: parseGpxCoords(txt), color: ROUTE_COLORS[i % ROUTE_COLORS.length] };
        } catch {
          return { route: r, coords: [], color: ROUTE_COLORS[i % ROUTE_COLORS.length] };
        }
      }),
    ).then((l) => active && setLines(l.filter((x) => x.coords.length > 1)));
    return () => { active = false; };
  }, [routes]);

  useEffect(() => {
    if (!isMember || !container.current || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const m = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.95, 39.65],
      zoom: 8.5,
    });
    m.addControl(new mapboxgl.NavigationControl(), "top-right");
    m.on("load", () => {
      m.addSource("camp", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "camp-lines", type: "line", source: "camp",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["==", ["get", "id"], ["coalesce", ["get", "sel"], ""]], 6, 3.5],
          "line-opacity": ["get", "opacity"],
        },
      });
      m.addLayer({
        id: "camp-hit", type: "line", source: "camp",
        paint: { "line-width": 16, "line-opacity": 0 },
      });
      m.on("click", "camp-hit", (e) => {
        e.originalEvent.stopPropagation();
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) setSelected(id);
      });
      m.on("click", (e) => {
        const hit = m.queryRenderedFeatures(e.point, { layers: ["camp-hit"] });
        if (!hit.length) setSelected(null);
      });
      m.on("mouseenter", "camp-hit", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "camp-hit", () => (m.getCanvas().style.cursor = ""));
      setMapReady(true);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; setMapReady(false); };
  }, [isMember]);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource("camp") as mapboxgl.GeoJSONSource;
    src.setData({
      type: "FeatureCollection",
      features: lines.map((l) => ({
        type: "Feature",
        properties: {
          id: l.route.id, color: l.color, sel: selected ?? "",
          opacity: !selected || selected === l.route.id ? 0.95 : 0.2,
        },
        geometry: { type: "LineString", coordinates: l.coords },
      })),
    });
    const target = selected ? lines.filter((l) => l.route.id === selected) : lines;
    if (target.length) {
      const b = new mapboxgl.LngLatBounds();
      target.forEach((l) => l.coords.forEach((c) => b.extend(c)));
      m.fitBounds(b, { padding: 50, duration: 600 });
    }
  }, [lines, selected, mapReady]);

  const colorOf = (id: string) => lines.find((l) => l.route.id === id)?.color;
  const sel = routes.find((r) => r.id === selected);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo title="Soustředění Mallorca | ESKO.cc" description="Trasy klubového soustředění na Mallorce." path="/mallorca" noindex />
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sun className="w-4 h-4" /><span className="text-sm font-medium">Soustředění</span>
            </div>
            <h1 className="text-display font-bold">Mallorca</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Všechny trasy soustředění na jedné mapě. Klikni na trasu pro detail.
            </p>
          </div>

          {!isMember && !roleLoading ? (
            <MemberOnlyContent title="Trasy pro členy" description="Trasy soustředění jsou dostupné jen členům klubu." />
          ) : (
            <>
              <div className="relative rounded-xl overflow-hidden border border-border">
                <div ref={container} className="h-[480px] w-full" />
                {sel && (
                  <div className="absolute left-3 bottom-3 right-3 sm:right-auto sm:max-w-sm rounded-lg bg-background/95 backdrop-blur p-3 shadow-lg border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{sel.camp_day ? `Den ${sel.camp_day}: ` : ""}{sel.title}</p>
                        <p className="text-xs text-muted-foreground">{sel.distance_km} km · {sel.elevation_m} m ↑</p>
                      </div>
                      <button onClick={() => setSelected(null)} aria-label="Zrušit výběr"><X className="w-4 h-4" /></button>
                    </div>
                    <Button size="sm" className="mt-2 w-full gap-2" onClick={() => navigate(getCampRoutePath(sel.slug))}>
                      Detail trasy <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
                </div>
              ) : routes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Trasy se připravují.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {routes.map((r) => (
                    <div
                      key={r.id}
                      onMouseEnter={() => setSelected(r.id)}
                      className={`rounded-xl border overflow-hidden bg-card transition-shadow hover:shadow-lg ${selected === r.id ? "border-primary" : "border-border"}`}
                    >
                      <Link to={getCampRoutePath(r.slug)} className="block">
                        <div className="h-40 bg-muted relative">
                          {r.cover_image_url && <img src={r.cover_image_url} alt={r.title} loading="lazy" className="w-full h-full object-cover" />}
                          <span className="absolute top-2 left-2 w-3 h-3 rounded-full ring-2 ring-background" style={{ background: colorOf(r.id) }} />
                        </div>
                        <div className="p-4 space-y-1">
                          {r.camp_day && <p className="text-xs text-primary font-medium">Den {r.camp_day}</p>}
                          <p className="font-semibold">{r.title}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5" />{r.distance_km} km</span>
                            <span className="flex items-center gap-1"><Mountain className="w-3.5 h-3.5" />{r.elevation_m} m</span>
                            <span>{DIFFICULTY_LABEL[r.difficulty]} · {TERRAIN_LABEL[r.terrain]}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
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

export default CampRoutes;
