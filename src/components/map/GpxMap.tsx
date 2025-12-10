import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface GpxMapProps {
  gpxUrl: string;
  showElevationProfile?: boolean;
}

interface GpxCoordinate {
  lng: number;
  lat: number;
  ele?: number;
}

interface ElevationPoint {
  distance: number;
  elevation: number;
}

/**
 * Calculate distance between two GPS points using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert coordinates to elevation profile data
 */
function getElevationProfile(coordinates: GpxCoordinate[]): ElevationPoint[] {
  const points: ElevationPoint[] = [];
  let cumulativeDistance = 0;
  
  for (let i = 0; i < coordinates.length; i++) {
    if (i > 0) {
      cumulativeDistance += haversineDistance(
        coordinates[i - 1].lat,
        coordinates[i - 1].lng,
        coordinates[i].lat,
        coordinates[i].lng
      );
    }
    
    if (coordinates[i].ele !== undefined) {
      points.push({
        distance: Math.round(cumulativeDistance * 10) / 10,
        elevation: Math.round(coordinates[i].ele!)
      });
    }
  }
  
  // Sample points to max 200 for performance
  if (points.length > 200) {
    const step = Math.ceil(points.length / 200);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }
  
  return points;
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

const GpxMap = ({ gpxUrl, showElevationProfile = true }: GpxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elevationData, setElevationData] = useState<ElevationPoint[]>([]);

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

        // Mapbox public token - safe to expose in frontend
        const mapboxToken = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

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

        // Generate elevation profile data immediately
        if (showElevationProfile) {
          const profile = getElevationProfile(coordinates);
          setElevationData(profile);
        }

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

          // Resize map to ensure proper rendering
          map.current.resize();
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
    <div className="space-y-4">
      <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-muted">
        {loading && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
      </div>
      
      {showElevationProfile && elevationData.length > 0 && (
        <div className="w-full h-32 md:h-40 bg-card rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground mb-2">Výškový profil</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={elevationData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="distance" 
                tick={{ fontSize: 10 }} 
                tickFormatter={(v) => `${v} km`}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickFormatter={(v) => `${v} m`}
                stroke="hsl(var(--muted-foreground))"
                domain={['dataMin - 50', 'dataMax + 50']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value} m`, 'Nadm. výška']}
                labelFormatter={(label) => `${label} km`}
              />
              <Area 
                type="monotone" 
                dataKey="elevation" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#elevationGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default GpxMap;
