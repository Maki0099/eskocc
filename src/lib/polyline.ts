export type LngLat = [number, number];

/** Decode a Google-encoded polyline (precision 5) into [lng, lat] pairs. */
export function decodePolyline(encoded: string): LngLat[] {
  const len = encoded.length;
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LngLat[] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}

/** Encode [lng, lat] pairs into a Google-encoded polyline (precision 5). */
export function encodePolyline(coords: LngLat[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let result = "";

  const encodeSigned = (num: number) => {
    let sgn = num << 1;
    if (num < 0) sgn = ~sgn;
    let out = "";
    while (sgn >= 0x20) {
      out += String.fromCharCode((0x20 | (sgn & 0x1f)) + 63);
      sgn >>= 5;
    }
    out += String.fromCharCode(sgn + 63);
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
}

/** Evenly downsample to at most `max` points, always keeping first and last. */
export function downsample(coords: LngLat[], max: number): LngLat[] {
  if (coords.length <= max) return coords;
  const step = (coords.length - 1) / (max - 1);
  const out: LngLat[] = [];
  for (let i = 0; i < max; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Build a GPX 1.1 track document from [lng, lat] pairs. */
export function coordsToGpx(coords: LngLat[], name: string, isoDate?: string): string {
  const points = coords
    .map(([lng, lat]) => `    <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"/>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ESKO.cc" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>${isoDate ? `\n    <time>${isoDate}</time>` : ""}
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

export function slugifyFileName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "trasa"
  );
}

/** Trigger a browser download of GPX content. */
export function downloadGpx(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".gpx") ? fileName : `${fileName}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
