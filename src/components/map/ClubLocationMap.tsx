import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface ClubLocationMapProps {
  className?: string;
}

// Mapbox public token - safe to expose in frontend
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

const ClubLocationMap = ({ className }: ClubLocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Karolinka, Vsetínská 85 coordinates (longitude, latitude)
  const CLUB_COORDINATES: [number, number] = [18.2401, 49.3513];

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = MAPBOX_TOKEN;
    
    if (!token) {
      setError("Mapbox token není nakonfigurován");
      return;
    }

    try {
      mapboxgl.accessToken = token;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: CLUB_COORDINATES,
        zoom: 14,
        pitch: 30,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        "top-right"
      );

      // Add marker for club location
      marker.current = new mapboxgl.Marker({
        color: "#0ea5e9",
      })
        .setLngLat(CLUB_COORDINATES)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <strong style="font-size: 14px;">ESKO.cc</strong>
              <p style="margin: 4px 0 0; font-size: 12px; color: #666;">
                Vsetínská 85<br/>
                756 05 Karolinka
              </p>
            </div>
          `)
        )
        .addTo(map.current);

      // Open popup by default
      marker.current.togglePopup();

      map.current.on("error", (e) => {
        console.error("Mapbox error:", e);
        setError("Nepodařilo se načíst mapu");
      });
    } catch (e) {
      console.error("Map initialization error:", e);
      setError("Nepodařilo se inicializovat mapu");
    }

    // Cleanup
    return () => {
      marker.current?.remove();
      map.current?.remove();
    };
  }, []);

  if (error) {
    return (
      <div className={className}>
        <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-muted-foreground mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">
              Vsetínská 85, 756 05 Karolinka
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default ClubLocationMap;
