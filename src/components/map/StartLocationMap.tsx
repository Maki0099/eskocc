import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface StartLocationMapProps {
  coordinates: [number, number] | { lat: number; lng: number } | number[];
  className?: string;
}

// Mapbox public token - safe to expose in frontend
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

const StartLocationMap = ({ coordinates, className }: StartLocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse coordinates to [lng, lat] format for Mapbox
  const parseCoordinates = (): [number, number] | null => {
    if (!coordinates) return null;

    // Array format [lat, lng] from Strava
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [lat, lng] = coordinates;
      if (typeof lat === "number" && typeof lng === "number") {
        return [lng, lat]; // Mapbox uses [lng, lat]
      }
    }

    // Object format { lat, lng }
    if (typeof coordinates === "object" && "lat" in coordinates && "lng" in coordinates) {
      return [coordinates.lng, coordinates.lat];
    }

    return null;
  };

  const lngLat = parseCoordinates();

  useEffect(() => {
    if (!mapContainer.current || !lngLat) return;

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
        center: lngLat,
        zoom: 13,
        pitch: 30,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        "top-right"
      );

      // Add marker for start location
      marker.current = new mapboxgl.Marker({
        color: "#22c55e", // Green color for start
      })
        .setLngLat(lngLat)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px;">
              <strong style="font-size: 14px;">Místo startu</strong>
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
  }, [lngLat?.[0], lngLat?.[1]]);

  if (!lngLat) {
    return null;
  }

  if (error) {
    return (
      <div className={className}>
        <div className="w-full h-[300px] rounded-lg bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapContainer} className="w-full h-[300px] rounded-lg" />
    </div>
  );
};

export default StartLocationMap;
