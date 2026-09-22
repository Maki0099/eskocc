import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  coordsToGpx,
  decodePolyline,
  downloadGpx,
  slugifyFileName,
  type LngLat,
} from "@/lib/polyline";

export const MAPBOX_TOKEN =
  "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

export interface RouteDetailData {
  name: string | null;
  activity_date: string;
  map_polyline: string | null;
  distance_km?: number | null;
  elevation_gain?: number | null;
  moving_time?: number | null;
}

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m} min`;
};

/** Download a route's polyline as a GPX file. Returns false when the route has no usable track. */
export function downloadRouteGpx(route: RouteDetailData): boolean {
  if (!route.map_polyline) return false;
  const coords = decodePolyline(route.map_polyline);
  if (coords.length < 2) {
    toast.error("Trasa neobsahuje dostatek bodů");
    return false;
  }
  const name = route.name || "Jízda";
  const gpx = coordsToGpx(coords, name, route.activity_date);
  downloadGpx(
    gpx,
    `${slugifyFileName(name)}-${format(new Date(route.activity_date), "yyyy-MM-dd")}.gpx`
  );
  toast.success("GPX staženo");
  return true;
}

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

interface Props {
  route: RouteDetailData | null;
  onOpenChange: (open: boolean) => void;
}

const RouteDetailDialog = ({ route, onOpenChange }: Props) => {
  const coords = useMemo(
    () => (route?.map_polyline ? decodePolyline(route.map_polyline) : []),
    [route]
  );

  return (
    <Dialog open={!!route} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{route?.name || "Trasa"}</DialogTitle>
        </DialogHeader>
        {route && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(route.activity_date), "d. MMMM yyyy", { locale: cs })}
            {route.distance_km != null &&
              ` · ${Number(route.distance_km).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} km`}
            {route.elevation_gain != null && ` · ${route.elevation_gain} m`}
            {route.moving_time ? ` · ${formatDuration(route.moving_time)}` : ""}
          </p>
        )}
        <div className="h-[60vh] rounded-lg overflow-hidden">
          {coords.length > 1 && <RouteDetailMap coords={coords} />}
        </div>
        {route && (
          <Button className="gap-2" onClick={() => downloadRouteGpx(route)}>
            <Download className="w-4 h-4" />
            Stáhnout GPX
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RouteDetailDialog;
