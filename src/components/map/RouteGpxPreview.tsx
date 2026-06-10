import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

interface Props {
  gpxUrl: string;
  title: string;
  className?: string;
}

const parseGpx = (xml: string): [number, number][] => {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const pts = Array.from(doc.getElementsByTagName("trkpt"));
  return pts
    .map((p) => {
      const lat = parseFloat(p.getAttribute("lat") || "");
      const lon = parseFloat(p.getAttribute("lon") || "");
      return [lon, lat] as [number, number];
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
};

const RouteGpxPreview = ({ gpxUrl, title, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lazy: init only when near viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current || mapRef.current) return;

    let cancelled = false;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [18.35, 49.47],
      zoom: 9,
      attributionControl: true,
    });
    mapRef.current = map;
    map.scrollZoom.disable();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    fetch(gpxUrl)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.text();
      })
      .then((xml) => {
        if (cancelled) return;
        const coords = parseGpx(xml);
        if (coords.length < 2) throw new Error("no points");

        const draw = () => {
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
            paint: { "line-color": "#7A6855", "line-width": 3 },
          });

          new mapboxgl.Marker({ color: "#B7A99A", scale: 0.7 })
            .setLngLat(coords[0])
            .addTo(map);
          new mapboxgl.Marker({ color: "#2F333A", scale: 0.7 })
            .setLngLat(coords[coords.length - 1])
            .addTo(map);

          const bounds = coords.reduce(
            (b, c) => b.extend(c as [number, number]),
            new mapboxgl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, { padding: 24, duration: 0 });
          setLoading(false);
        };

        if (map.isStyleLoaded()) draw();
        else map.once("load", draw);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Náhled mapy se nepodařilo načíst");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, [visible, gpxUrl]);

  return (
    <div
      className={`relative w-full h-[180px] rounded-md overflow-hidden border border-border bg-muted ${className ?? ""}`}
      aria-label={`Náhled trasy ${title} na mapě`}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
          Načítám náhled…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {error}
        </div>
      )}
    </div>
  );
};

export default RouteGpxPreview;
