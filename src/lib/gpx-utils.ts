/**
 * GPX file parsing utilities for extracting distance, elevation, and metadata
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

export interface GpxMetadata {
  name?: string;
  description?: string;
  distanceKm: number;
  elevationM: number;
  startPoint: { lat: number; lon: number } | null;
  endPoint: { lat: number; lon: number } | null;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null;
  maxElevation: number | null;
  minElevation: number | null;
  avgGradient: number | null;
}

export type DifficultyLevel = "easy" | "medium" | "hard";

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

/**
 * Parse GPX file and extract full metadata including name, description, bounds, etc.
 */
export async function parseGpxMetadata(file: File): Promise<GpxMetadata | null> {
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
    
    // Extract name from GPX metadata (try different locations)
    let name: string | undefined;
    const nameElement = xmlDoc.querySelector("trk > name") || 
                        xmlDoc.querySelector("rte > name") || 
                        xmlDoc.querySelector("metadata > name");
    if (nameElement?.textContent) {
      name = nameElement.textContent.trim();
    }
    
    // Extract description
    let description: string | undefined;
    const descElement = xmlDoc.querySelector("trk > desc") || 
                        xmlDoc.querySelector("rte > desc") || 
                        xmlDoc.querySelector("metadata > desc");
    if (descElement?.textContent) {
      description = descElement.textContent.trim();
    }
    
    // Calculate statistics
    const distanceKm = calculateTotalDistance(points);
    const elevationM = calculateElevationGain(points);
    
    // Start and end points
    const startPoint = { lat: points[0].lat, lon: points[0].lon };
    const endPoint = { lat: points[points.length - 1].lat, lon: points[points.length - 1].lon };
    
    // Calculate bounds
    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);
    const bounds = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };
    
    // Calculate elevation statistics
    const elevations = points.filter(p => p.ele !== null).map(p => p.ele as number);
    const maxElevation = elevations.length > 0 ? Math.max(...elevations) : null;
    const minElevation = elevations.length > 0 ? Math.min(...elevations) : null;
    
    // Calculate average gradient (elevation gain per km)
    const avgGradient = distanceKm > 0 ? elevationM / distanceKm : null;
    
    return {
      name,
      description,
      distanceKm: Math.round(distanceKm),
      elevationM: Math.round(elevationM),
      startPoint,
      endPoint,
      bounds,
      maxElevation: maxElevation !== null ? Math.round(maxElevation) : null,
      minElevation: minElevation !== null ? Math.round(minElevation) : null,
      avgGradient: avgGradient !== null ? Math.round(avgGradient * 10) / 10 : null,
    };
  } catch (error) {
    console.error("Error parsing GPX metadata:", error);
    return null;
  }
}

/**
 * Calculate difficulty based on distance and elevation
 */
export function calculateDifficulty(distanceKm: number, elevationM: number): DifficultyLevel {
  // Difficulty based on distance
  const distanceDifficulty: DifficultyLevel = 
    distanceKm < 40 ? "easy" : 
    distanceKm <= 80 ? "medium" : "hard";
  
  // Difficulty based on elevation
  const elevationDifficulty: DifficultyLevel = 
    elevationM < 500 ? "easy" : 
    elevationM <= 1200 ? "medium" : "hard";
  
  // Difficulty based on elevation per km (steepness)
  const elevationPerKm = distanceKm > 0 ? elevationM / distanceKm : 0;
  const steepnessDifficulty: DifficultyLevel = 
    elevationPerKm < 15 ? "easy" : 
    elevationPerKm <= 25 ? "medium" : "hard";
  
  // Return the maximum difficulty
  const difficultyOrder: DifficultyLevel[] = ["easy", "medium", "hard"];
  const maxIndex = Math.max(
    difficultyOrder.indexOf(distanceDifficulty),
    difficultyOrder.indexOf(elevationDifficulty),
    difficultyOrder.indexOf(steepnessDifficulty)
  );
  
  return difficultyOrder[maxIndex];
}

/**
 * Generate a static map URL for a route based on bounds
 */
export function generateStaticMapUrl(
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  startPoint?: { lat: number; lon: number },
  endPoint?: { lat: number; lon: number }
): string {
  // Calculate center and zoom level
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;
  
  // Calculate zoom level based on bounds span
  const latSpan = bounds.maxLat - bounds.minLat;
  const lonSpan = bounds.maxLon - bounds.minLon;
  const maxSpan = Math.max(latSpan, lonSpan);
  
  // Approximate zoom level (higher span = lower zoom)
  let zoom = 10;
  if (maxSpan > 2) zoom = 6;
  else if (maxSpan > 1) zoom = 7;
  else if (maxSpan > 0.5) zoom = 8;
  else if (maxSpan > 0.2) zoom = 9;
  else if (maxSpan > 0.1) zoom = 10;
  else if (maxSpan > 0.05) zoom = 11;
  else zoom = 12;
  
  // Build markers string - use simple color names for openstreetmap.de
  let markers = "";
  if (startPoint) {
    markers += `&markers=${startPoint.lat},${startPoint.lon},lightblue`;
  }
  if (endPoint && (endPoint.lat !== startPoint?.lat || endPoint.lon !== startPoint?.lon)) {
    markers += `&markers=${endPoint.lat},${endPoint.lon},red`;
  }
  
  // Use OpenStreetMap static map service
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLon}&zoom=${zoom}&size=600x300${markers}&maptype=mapnik`;
}

/**
 * Read file as base64 data URL
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
