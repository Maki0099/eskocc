import { useEffect, useState } from "react";
import { MapOff } from "lucide-react";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibWFraTA5OSIsImEiOiJjbWdydmlmYTgwN3NvMnNyNXg0NjgzYW5iIn0.AiNtdl1RlCCszZnRDT8zUw";

interface Props {
  gpxUrl: string;
  title: string;
  className?: string;
}

type LngLat = [number, number];

const parseGpx = (xml: string): LngLat[] => {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const pts = Array.from(doc.getElementsByTagName("trkpt"));
  return pts
    .map((p) => {
      const lat = parseFloat(p.getAttribute("lat") || "");
      const lon = parseFloat(p.getAttribute("lon") || "");
      return [lon, lat] as LngLat;
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
};

// Evenly downsample to at most `max` points, always keeping first and last.
const downsample = (coords: LngLat[], max: number): LngLat[] => {
  if (coords.length <= max) return coords;
  const step = (coords.length - 1) / (max - 1);
  const out: LngLat[] = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.round(i * step);
    out.push(coords[idx]);
  }
  return out;
};

// Google Encoded Polyline Algorithm Format, precision 5.
const encodePolyline = (coords: LngLat[]): string => {
  let prevLat = 0;
  let prevLng = 0;
  let result = "";

  const encodeSigned = (num: number) => {
    let sgn_num = num << 1;
    if (num < 0) sgn_num = ~sgn_num;
    let out = "";
    while (sgn_num >= 0x20) {
      out += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
      sgn_num >>= 5;
    }
    out += String.fromCharCode(sgn_num + 63);
    return out;
  };

  for (const [lng, lat] of coords) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);
    result += encodeSigned(latE5 - prevLat);
    result += encodeSigned(lngE5 - prevLng);
    prevLat = latE5;
    prevLng = lngE5;
  }
  return result;
};

const RouteGpxPreview = ({ gpxUrl, title, className }: Props) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setImgUrl(null);

    fetch(gpxUrl)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.text();
      })
      .then((xml) => {
        if (cancelled) return;
        const all = parseGpx(xml);
        if (all.length < 2) throw new Error("no points");

        const coords = downsample(all, 80);
        const encoded = encodePolyline(coords);
        // URL-encode the polyline (it can contain reserved chars like `?`, `\`, `<`, `>`, etc.)
        const safePoly = encodeURIComponent(encoded);

        const [startLng, startLat] = coords[0];
        const [endLng, endLat] = coords[coords.length - 1];

        const path = `path-4+7A6855-0.95(${safePoly})`;
        const startPin = `pin-s+B7A99A(${startLng.toFixed(5)},${startLat.toFixed(5)})`;
        const endPin = `pin-s+2F333A(${endLng.toFixed(5)},${endLat.toFixed(5)})`;
        const overlay = `${path},${startPin},${endPin}`;

        const url =
          `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/` +
          `${overlay}/auto/640x360@2x?padding=24&access_token=${MAPBOX_TOKEN}`;

        setImgUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("Náhled mapy se nepodařilo načíst");
      });

    return () => {
      cancelled = true;
    };
  }, [gpxUrl]);

  return (
    <div
      className={`relative w-full h-[180px] rounded-md overflow-hidden border border-border bg-muted ${className ?? ""}`}
      aria-label={`Náhled trasy ${title} na mapě`}
    >
      {imgUrl && !error && (
        <img
          src={imgUrl}
          alt={`Mapa trasy ${title}`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setError("Náhled mapy se nepodařilo načíst")}
        />
      )}
      {!imgUrl && !error && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted/60" />
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-foreground/70 bg-background/80">
          <MapOff className="h-4 w-4" aria-hidden />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default RouteGpxPreview;
