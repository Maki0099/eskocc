/**
 * GPX file parsing utilities for extracting distance and elevation data
 */

interface GpxPoint {
  lat: number;
  lon: number;
  ele: number | null;
}

interface GpxStats {
  distanceKm: number;
  elevationM: number;
}

/**
 * Calculate distance between two GPS points using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
 * Parse GPX file and extract track points
 */
function parseGpxPoints(xmlDoc: Document): GpxPoint[] {
  const points: GpxPoint[] = [];
  
  // Try to get track points (trkpt) first, then route points (rtept)
  let trackPoints = xmlDoc.querySelectorAll("trkpt");
  if (trackPoints.length === 0) {
    trackPoints = xmlDoc.querySelectorAll("rtept");
  }
  
  trackPoints.forEach((point) => {
    const lat = parseFloat(point.getAttribute("lat") || "0");
    const lon = parseFloat(point.getAttribute("lon") || "0");
    const eleElement = point.querySelector("ele");
    const ele = eleElement ? parseFloat(eleElement.textContent || "0") : null;
    
    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ lat, lon, ele });
    }
  });
  
  return points;
}

/**
 * Calculate total distance from track points
 */
function calculateTotalDistance(points: GpxPoint[]): number {
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    totalDistance += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
  }
  
  return totalDistance;
}

/**
 * Calculate total elevation gain from track points
 */
function calculateElevationGain(points: GpxPoint[]): number {
  let totalGain = 0;
  let prevEle: number | null = null;
  
  for (const point of points) {
    if (point.ele !== null && !isNaN(point.ele)) {
      if (prevEle !== null) {
        const diff = point.ele - prevEle;
        if (diff > 0) {
          totalGain += diff;
        }
      }
      prevEle = point.ele;
    }
  }
  
  return totalGain;
}

/**
 * Parse GPX file and extract statistics
 */
export async function parseGpxFile(file: File): Promise<GpxStats | null> {
  try {
    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.error("GPX parsing error:", parserError.textContent);
      return null;
    }
    
    const points = parseGpxPoints(xmlDoc);
    
    if (points.length < 2) {
      console.warn("GPX file has insufficient track points");
      return null;
    }
    
    const distanceKm = calculateTotalDistance(points);
    const elevationM = calculateElevationGain(points);
    
    return {
      distanceKm: Math.round(distanceKm),
      elevationM: Math.round(elevationM),
    };
  } catch (error) {
    console.error("Error parsing GPX file:", error);
    return null;
  }
}
