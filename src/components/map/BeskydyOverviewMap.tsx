import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { BESKYDY_POIS } from "@/data/beskydyPois";

const MAPBOX_TOKEN = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

const COLOR_BY_TYPE: Record<string, string> = {
  club: "#7A6855",
  summit: "#B7A99A",
  pass: "#A39382",
  cafe: "#2F333A",
};

const BeskydyOverviewMap = ({ className }: { className?: string }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [18.35, 49.47],
        zoom: 9.2,
      });
      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");
      map.current.scrollZoom.disable();

      map.current.on("load", () => {
        BESKYDY_POIS.forEach((poi) => {
          new mapboxgl.Marker({ color: COLOR_BY_TYPE[poi.type] ?? "#7A6855" })
            .setLngLat([poi.lng, poi.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 24, focusAfterOpen: false }).setHTML(
                `<div style="padding:6px;max-width:200px;">
                  <strong style="font-size:13px;">${poi.name}</strong>
                  <p style="margin:4px 0 0;font-size:12px;color:#555;">${poi.description}</p>
                </div>`
              )
            )
            .addTo(map.current!);
        });
      });

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("Nepodařilo se načíst mapu");
      });
    } catch (e) {
      console.error("Map init error:", e);
      setError("Nepodařilo se inicializovat mapu");
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  if (error) {
    return (
      <div className={className}>
        <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
    </div>
  );
};

export default BeskydyOverviewMap;
