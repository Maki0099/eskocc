import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';

interface GpxMapProps {
  gpxUrl: string;
}

interface GpxCoordinate {
  lng: number;
  lat: number;
  ele?: number;
}

/**
 * Parse GPX file from URL and extract coordinates
 */
async function parseGpxFromUrl(url: string): Promise<GpxCoordinate[]> {
  const response = await fetch(url);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'application/xml');
  
  const coordinates: GpxCoordinate[] = [];
  
  // Try track points first, then route points
  let points = xmlDoc.querySelectorAll('trkpt');
  if (points.length === 0) {
    points = xmlDoc.querySelectorAll('rtept');
  }
  
  points.forEach((point) => {
    const lat = parseFloat(point.getAttribute('lat') || '0');
    const lng = parseFloat(point.getAttribute('lon') || '0');
    const eleElement = point.querySelector('ele');
    const ele = eleElement ? parseFloat(eleElement.textContent || '0') : undefined;
    
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates.push({ lat, lng, ele });
    }
  });
  
  return coordinates;
}

/**
 * Calculate bounds from coordinates
 */
function getBounds(coordinates: GpxCoordinate[]): mapboxgl.LngLatBoundsLike {
  const lngs = coordinates.map(c => c.lng);
  const lats = coordinates.map(c => c.lat);
  
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ];
}

const GpxMap = ({ gpxUrl }: GpxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !gpxUrl) return;

    const initMap = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Parse GPX file
        const coordinates = await parseGpxFromUrl(gpxUrl);
        
        if (coordinates.length < 2) {
          setError('GPX soubor neobsahuje dostatek bodů');
          setLoading(false);
          return;
        }

        // Get Mapbox token from env
        const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
        if (!mapboxToken) {
          setError('Mapbox token není nastaven');
          setLoading(false);
          return;
        }

        mapboxgl.accessToken = mapboxToken;

        // Calculate bounds
        const bounds = getBounds(coordinates);

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/outdoors-v12',
          bounds: bounds,
          fitBoundsOptions: {
            padding: 50
          }
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        // Add fullscreen control
        map.current.addControl(new mapboxgl.FullscreenControl());

        // Wait for map to load
        map.current.on('load', () => {
          if (!map.current) return;

          // Add the GPX track as a GeoJSON source
          map.current.addSource('gpx-track', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates.map(c => [c.lng, c.lat])
              }
            }
          });

          // Add a line layer for the track
          map.current.addLayer({
            id: 'gpx-track-line',
            type: 'line',
            source: 'gpx-track',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#B7A99A',
              'line-width': 4,
              'line-opacity': 0.9
            }
          });

          // Add a wider transparent line for easier interaction
          map.current.addLayer({
            id: 'gpx-track-line-bg',
            type: 'line',
            source: 'gpx-track',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#B7A99A',
              'line-width': 8,
              'line-opacity': 0.3
            }
          }, 'gpx-track-line');

          // Add start marker
          const startCoord = coordinates[0];
          new mapboxgl.Marker({ color: '#22c55e' })
            .setLngLat([startCoord.lng, startCoord.lat])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Start</strong>'))
            .addTo(map.current);

          // Add end marker
          const endCoord = coordinates[coordinates.length - 1];
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat([endCoord.lng, endCoord.lat])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Cíl</strong>'))
            .addTo(map.current);

          setLoading(false);
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setError('Chyba při načítání mapy');
          setLoading(false);
        });

      } catch (err) {
        console.error('Error loading GPX:', err);
        setError('Nepodařilo se načíst GPX soubor');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [gpxUrl]);

  if (error) {
    return (
      <div className="w-full h-64 rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default GpxMap;
