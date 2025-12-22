import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapIcon, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GpxPreviewMapProps {
  gpxData: string; // base64 or URL
  compact?: boolean;
}

interface GpxCoordinate {
  lng: number;
  lat: number;
  ele?: number;
}

/**
 * Parse GPX content and extract coordinates
 */
function parseGpxContent(content: string): GpxCoordinate[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'application/xml');
  
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
 * Decode base64 GPX data
 */
function decodeBase64Gpx(base64: string): string {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
  return atob(base64Data);
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

interface MapRendererProps {
  coordinates: GpxCoordinate[];
  compact?: boolean;
  containerId: string;
}

function MapRenderer({ coordinates, compact, containerId }: MapRendererProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || coordinates.length < 2) return;

    const mapboxToken = "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";
    mapboxgl.accessToken = mapboxToken;

    const bounds = getBounds(coordinates);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      bounds: bounds,
      fitBoundsOptions: {
        padding: compact ? 20 : 40
      },
      interactive: !compact,
    });

    if (!compact) {
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );
    }

    map.current.on('load', () => {
      if (!map.current) return;

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

      map.current.addLayer({
        id: 'gpx-track-line',
        type: 'line',
        source: 'gpx-track',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#e63946',
          'line-width': compact ? 2 : 4,
          'line-opacity': 0.9
        }
      });

      // Add start/end markers only in non-compact mode
      if (!compact) {
        const startCoord = coordinates[0];
        new mapboxgl.Marker({ color: '#22c55e', scale: 0.8 })
          .setLngLat([startCoord.lng, startCoord.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Start</strong>'))
          .addTo(map.current);

        const endCoord = coordinates[coordinates.length - 1];
        new mapboxgl.Marker({ color: '#ef4444', scale: 0.8 })
          .setLngLat([endCoord.lng, endCoord.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Cíl</strong>'))
          .addTo(map.current);
      }

      map.current.resize();
      setLoading(false);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [coordinates, compact, containerId]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}

export function GpxPreviewMap({ gpxData, compact = false }: GpxPreviewMapProps) {
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const coordinates = useMemo(() => {
    try {
      let content: string;
      if (gpxData.startsWith('data:') || gpxData.match(/^[A-Za-z0-9+/=]+$/)) {
        content = decodeBase64Gpx(gpxData);
      } else {
        // Assume it's already XML content
        content = gpxData;
      }
      const coords = parseGpxContent(content);
      if (coords.length < 2) {
        setError('GPX neobsahuje dostatek bodů');
        return [];
      }
      return coords;
    } catch (e) {
      console.error('GPX parse error:', e);
      setError('Nepodařilo se načíst GPX');
      return [];
    }
  }, [gpxData]);

  if (error || coordinates.length < 2) {
    return (
      <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
        <div className="text-center p-2">
          <MapIcon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">{error || 'Náhled nedostupný'}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="relative w-full h-full rounded-lg overflow-hidden">
          <MapRenderer coordinates={coordinates} compact containerId="compact-map" />
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Náhled trasy</DialogTitle>
          </DialogHeader>
          <div className="h-[60vh] rounded-lg overflow-hidden">
            <MapRenderer coordinates={coordinates} compact={false} containerId="dialog-map" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <MapRenderer coordinates={coordinates} compact={false} containerId="full-map" />
    </div>
  );
}
