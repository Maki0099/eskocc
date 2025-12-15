import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRoute {
  id: string;
  title: string;
  description?: string;
  distance_km?: number;
  elevation_m?: number;
  gpx_url?: string;
  gpx_accessible: boolean;
  cover_url?: string;
  route_link?: string;
}

async function testGpxAccessibility(url: string): Promise<boolean> {
  try {
    // RideWithGPS public trips/routes are always accessible
    if (url.includes('ridewithgps.com/trips/') || url.includes('ridewithgps.com/routes/')) {
      return true;
    }
    
    // bicycle.holiday GPX files are always accessible
    if (url.includes('bicycle.holiday')) {
      return true;
    }
    
    // For other services, try GET with range header (downloads only 1 byte)
    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': 'bytes=0-0'
      },
      redirect: 'follow'
    });
    // 200 OK or 206 Partial Content = accessible
    return response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}

function extractNumber(text: string): number | undefined {
  const match = text.match(/[\d\s]+/);
  if (match) {
    const num = parseInt(match[0].replace(/\s/g, ''), 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

async function parseBicycleHoliday(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  // Try table-based parsing first (for /cs/trasy-a-vylety/ page)
  const tableRowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const tableRows = html.match(tableRowPattern) || [];
  
  console.log(`Found ${tableRows.length} table rows`);
  
  let tableRoutes: ParsedRoute[] = [];
  
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    
    // Skip header rows (contain <th>)
    if (row.includes('<th')) continue;
    
    // Extract title and link from h5 or strong tag with anchor
    const titleMatch = row.match(/<(?:h5|h4|h3|strong)[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i) ||
                       row.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*route[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                       row.match(/<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/i);
    
    if (!titleMatch) continue;
    
    const routeLink = titleMatch[1].startsWith('http') ? titleMatch[1] : new URL(titleMatch[1], baseUrl).href;
    const title = titleMatch[2].trim().replace(/&amp;/g, '&').replace(/&#8211;/g, '–');
    
    // Extract cover image
    const imgMatch = row.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
    const coverUrl = imgMatch ? imgMatch[1] : undefined;
    
    // Extract distance - look for pattern like "60,5 km" or "60.5 km"
    const distanceMatch = row.match(/(\d+[.,]?\d*)\s*km/i);
    const distance_km = distanceMatch ? parseFloat(distanceMatch[1].replace(',', '.')) : undefined;
    
    // Extract elevation - look for pattern like "639 m" or "1 265 m" (with space in number)
    const elevationMatch = row.match(/(?:převýšení|elevation|↑)[:\s]*(\d[\d\s]*)\s*m/i) ||
                          row.match(/(\d[\d\s]*)\s*m\s*(?:převýšení|elevation|↑)/i) ||
                          row.match(/<td[^>]*>[^<]*(\d[\d\s]+)\s*m[^<]*<\/td>/i);
    const elevation_m = elevationMatch ? parseInt(elevationMatch[1].replace(/\s/g, ''), 10) : undefined;
    
    // Extract GPX URL directly from row (RideWithGPS links)
    let gpx_url: string | undefined;
    const gpxMatch = row.match(/href="([^"]*ridewithgps\.com\/(?:trips|routes)\/(\d+)[^"]*)"/i) ||
                     row.match(/ridewithgps\.com\/(?:trips|routes)\/(\d+)/i);
    
    if (gpxMatch) {
      const routeId = gpxMatch[2] || gpxMatch[1];
      if (gpxMatch[0].includes('trips')) {
        gpx_url = `https://ridewithgps.com/trips/${routeId}.gpx?sub_format=track`;
      } else {
        gpx_url = `https://ridewithgps.com/routes/${routeId}.gpx?sub_format=track`;
      }
    }
    
    // Also check for direct .gpx links
    if (!gpx_url) {
      const directGpxMatch = row.match(/href="([^"]+\.gpx[^"]*)"/i);
      if (directGpxMatch) {
        gpx_url = directGpxMatch[1].startsWith('http') ? directGpxMatch[1] : new URL(directGpxMatch[1], baseUrl).href;
      }
    }
    
    const id = `bh-table-${i}-${title.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
    
    tableRoutes.push({
      id,
      title,
      distance_km,
      elevation_m,
      gpx_url,
      gpx_accessible: false,
      cover_url: coverUrl,
      route_link: routeLink
    });
  }
  
  console.log(`Parsed ${tableRoutes.length} routes from table structure`);
  
  // If table parsing found routes, use those
  if (tableRoutes.length > 0) {
    routes.push(...tableRoutes);
  } else {
    // Fallback to Elementor article structure
    const articlePattern = /<article[^>]*class="[^"]*elementor-post[^"]*"[^>]*>[\s\S]*?<\/article>/gi;
    const articles = html.match(articlePattern) || [];
    
    console.log(`Fallback: Found ${articles.length} article elements`);
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      const titleMatch = article.match(/<h3[^>]*class="[^"]*elementor-post__title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
      if (!titleMatch) continue;
      
      const routeLink = titleMatch[1];
      const title = titleMatch[2].trim();
      
      const imgMatch = article.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
      const coverUrl = imgMatch ? imgMatch[1] : undefined;
      
      const excerptMatch = article.match(/<div[^>]*class="[^"]*elementor-post__excerpt[^"]*"[^>]*>[\s\S]*?<p>([^<]+)<\/p>/i);
      const description = excerptMatch ? excerptMatch[1].trim() : undefined;
      
      let distance_km: number | undefined;
      let elevation_m: number | undefined;
      
      const distanceMatch = (title + ' ' + (description || '')).match(/(\d+)\s*km/i);
      const elevationMatch = (title + ' ' + (description || '')).match(/(\d+)\s*m\b(?!\s*km)/i);
      
      if (distanceMatch) distance_km = parseInt(distanceMatch[1], 10);
      if (elevationMatch) elevation_m = parseInt(elevationMatch[1], 10);
      
      const id = `bh-${i}-${title.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
      
      routes.push({
        id,
        title,
        description,
        distance_km,
        elevation_m,
        gpx_url: undefined,
        gpx_accessible: false,
        cover_url: coverUrl,
        route_link: routeLink
      });
    }
  }
  
  // For routes without GPX URL, try to fetch from detail page
  for (const route of routes) {
    if (!route.gpx_url && route.route_link) {
      try {
        console.log(`Fetching detail page: ${route.route_link}`);
        const detailResponse = await fetch(route.route_link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (detailResponse.ok) {
          const detailHtml = await detailResponse.text();
          
          const gpxPatterns = [
            /href="([^"]*ridewithgps\.com\/(?:trips|routes)\/(\d+)[^"]*)"/i,
            /ridewithgps\.com\/(?:trips|routes)\/(\d+)/i,
            /href="([^"]+\.gpx[^"]*)"/i,
            /data-gpx="([^"]+)"/i
          ];
          
          for (const pattern of gpxPatterns) {
            const gpxMatch = detailHtml.match(pattern);
            if (gpxMatch) {
              if (pattern.source.includes('ridewithgps')) {
                const routeId = gpxMatch[2] || gpxMatch[1];
                const type = gpxMatch[0].includes('trips') ? 'trips' : 'routes';
                route.gpx_url = `https://ridewithgps.com/${type}/${routeId}.gpx?sub_format=track`;
              } else {
                route.gpx_url = gpxMatch[1].startsWith('http') ? gpxMatch[1] : new URL(gpxMatch[1], route.route_link).href;
              }
              break;
            }
          }
          
          if (!route.distance_km) {
            const distMatch = detailHtml.match(/(\d+[.,]?\d*)\s*km/i);
            if (distMatch) route.distance_km = parseFloat(distMatch[1].replace(',', '.'));
          }
          if (!route.elevation_m) {
            const elevMatch = detailHtml.match(/převýšení[:\s]*(\d[\d\s]*)\s*m/i) || 
                             detailHtml.match(/elevation[:\s]*(\d[\d\s]*)\s*m/i) ||
                             detailHtml.match(/(\d{3,4})\s*m\s*(?:převýšení|elevation|↑)/i);
            if (elevMatch) route.elevation_m = parseInt(elevMatch[1].replace(/\s/g, ''), 10);
          }
        }
      } catch (error) {
        console.error(`Error fetching detail page ${route.route_link}:`, error);
      }
    }
    
    // Test GPX accessibility
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
      console.log(`GPX ${route.gpx_url} accessible: ${route.gpx_accessible}`);
    }
  }
  
  return routes;
}

async function parseRideWithGps(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing RideWithGPS page...');
  
  // Pattern for route cards/list items
  // RideWithGPS typically has route links like /routes/12345678
  const routePattern = /<a[^>]*href="(\/routes\/(\d+))"[^>]*>[\s\S]*?<\/a>/gi;
  const routeMatches = [...html.matchAll(routePattern)];
  
  // Also try to find route cards with more structure
  const cardPattern = /<div[^>]*class="[^"]*route[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const cards = html.match(cardPattern) || [];
  
  // Extract route IDs from various patterns
  const routeIds = new Set<string>();
  
  // From direct links
  const idPattern = /\/routes\/(\d+)/g;
  let match;
  while ((match = idPattern.exec(html)) !== null) {
    routeIds.add(match[1]);
  }
  
  console.log(`Found ${routeIds.size} unique route IDs`);
  
  for (const routeId of routeIds) {
    // Try to extract more details from the HTML
    const routeSection = html.match(new RegExp(`<[^>]*href="[^"]*\\/routes\\/${routeId}"[^>]*>[\\s\\S]*?(?=<[^>]*href="[^"]*\\/routes\\/|$)`, 'i'));
    
    let title = `Route ${routeId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    
    if (routeSection) {
      const section = routeSection[0];
      
      // Extract title
      const titleMatch = section.match(/>([^<]{5,100})</);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      // Extract distance (mi or km)
      const distMiMatch = section.match(/([\d.]+)\s*mi/i);
      const distKmMatch = section.match(/([\d.]+)\s*km/i);
      if (distKmMatch) {
        distance_km = parseFloat(distKmMatch[1]);
      } else if (distMiMatch) {
        distance_km = Math.round(parseFloat(distMiMatch[1]) * 1.60934);
      }
      
      // Extract elevation (ft or m)
      const elevFtMatch = section.match(/([\d,]+)\s*ft/i);
      const elevMMatch = section.match(/([\d,]+)\s*m(?!\s*i)/i);
      if (elevMMatch) {
        elevation_m = parseInt(elevMMatch[1].replace(/,/g, ''), 10);
      } else if (elevFtMatch) {
        elevation_m = Math.round(parseInt(elevFtMatch[1].replace(/,/g, ''), 10) * 0.3048);
      }
      
      // Extract cover image
      const imgMatch = section.match(/src="([^"]+(?:\.jpg|\.png|\.jpeg|static_map)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
    }
    
    const gpxUrl = `https://ridewithgps.com/routes/${routeId}.gpx`;
    
    routes.push({
      id: `rwgps-${routeId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: gpxUrl,
      gpx_accessible: false, // RideWithGPS requires auth for GPX download
      cover_url: coverUrl,
      route_link: `https://ridewithgps.com/routes/${routeId}`
    });
  }
  
  // Test GPX accessibility (will likely be false for RWGPS)
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
  }
  
  return routes;
}

async function parseStrava(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Strava page...');
  
  // Strava routes pattern: /routes/12345678
  const routeIds = new Set<string>();
  const routePattern = /\/routes\/(\d+)/g;
  let match;
  while ((match = routePattern.exec(html)) !== null) {
    routeIds.add(match[1]);
  }
  
  // Also check for segments: /segments/12345678
  const segmentIds = new Set<string>();
  const segmentPattern = /\/segments\/(\d+)/g;
  while ((match = segmentPattern.exec(html)) !== null) {
    segmentIds.add(match[1]);
  }
  
  console.log(`Found ${routeIds.size} routes and ${segmentIds.size} segments`);
  
  // Process routes
  for (const routeId of routeIds) {
    let title = `Strava Route ${routeId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    
    // Try to extract details from surrounding HTML
    const routeSection = html.match(new RegExp(`[\\s\\S]{0,500}\\/routes\\/${routeId}[\\s\\S]{0,500}`, 'i'));
    if (routeSection) {
      const section = routeSection[0];
      
      // Extract title - look for text near the link
      const titleMatch = section.match(/(?:title|name|data-name)="([^"]+)"/i) ||
                        section.match(/>([A-Za-z0-9][^<]{3,60})</);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      // Distance
      const distMatch = section.match(/([\d.]+)\s*km/i);
      if (distMatch) {
        distance_km = parseFloat(distMatch[1]);
      }
      
      // Elevation
      const elevMatch = section.match(/([\d,]+)\s*m\s*(?:elev|↑|gain)/i);
      if (elevMatch) {
        elevation_m = parseInt(elevMatch[1].replace(/,/g, ''), 10);
      }
      
      // Cover image
      const imgMatch = section.match(/src="([^"]+(?:cloudfront|strava)[^"]+)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
    }
    
    routes.push({
      id: `strava-route-${routeId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: `https://www.strava.com/routes/${routeId}/export_gpx`,
      gpx_accessible: false, // Strava requires auth
      cover_url: coverUrl,
      route_link: `https://www.strava.com/routes/${routeId}`
    });
  }
  
  // Process segments (optional, usually shorter)
  for (const segmentId of segmentIds) {
    let title = `Strava Segment ${segmentId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    
    const segSection = html.match(new RegExp(`[\\s\\S]{0,500}\\/segments\\/${segmentId}[\\s\\S]{0,500}`, 'i'));
    if (segSection) {
      const section = segSection[0];
      
      const titleMatch = section.match(/(?:title|name)="([^"]+)"/i) ||
                        section.match(/>([A-Za-z0-9][^<]{3,40})</);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      const distMatch = section.match(/([\d.]+)\s*km/i);
      if (distMatch) {
        distance_km = parseFloat(distMatch[1]);
      }
      
      const elevMatch = section.match(/([\d,]+)\s*m/i);
      if (elevMatch) {
        elevation_m = parseInt(elevMatch[1].replace(/,/g, ''), 10);
      }
    }
    
    routes.push({
      id: `strava-segment-${segmentId}`,
      title,
      description: 'Strava segment',
      distance_km,
      elevation_m,
      gpx_url: undefined, // Segments don't have direct GPX export
      gpx_accessible: false,
      route_link: `https://www.strava.com/segments/${segmentId}`
    });
  }
  
  return routes;
}

async function parseKomoot(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Komoot page...');
  
  // Komoot tour pattern: /tour/12345678
  const tourIds = new Set<string>();
  const tourPattern = /\/tour\/(\d+)/g;
  let match;
  while ((match = tourPattern.exec(html)) !== null) {
    tourIds.add(match[1]);
  }
  
  console.log(`Found ${tourIds.size} Komoot tours`);
  
  for (const tourId of tourIds) {
    let title = `Komoot Tour ${tourId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    
    const tourSection = html.match(new RegExp(`[\\s\\S]{0,800}\\/tour\\/${tourId}[\\s\\S]{0,800}`, 'i'));
    if (tourSection) {
      const section = tourSection[0];
      
      // Title
      const titleMatch = section.match(/(?:data-test-id="tour_name"|class="[^"]*name[^"]*")[^>]*>([^<]+)</i) ||
                        section.match(/>([A-Za-z0-9][^<]{5,80})</);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      // Distance
      const distMatch = section.match(/([\d.]+)\s*km/i);
      if (distMatch) {
        distance_km = parseFloat(distMatch[1]);
      }
      
      // Elevation
      const elevMatch = section.match(/([\d,]+)\s*m\s*(?:↑|up|elevation)/i);
      if (elevMatch) {
        elevation_m = parseInt(elevMatch[1].replace(/,/g, ''), 10);
      }
      
      // Cover image
      const imgMatch = section.match(/src="([^"]+(?:komoot|images)[^"]+\.(?:jpg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
    }
    
    routes.push({
      id: `komoot-${tourId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: `https://www.komoot.com/tour/${tourId}/download`,
      gpx_accessible: false, // Komoot requires auth for GPX
      cover_url: coverUrl,
      route_link: `https://www.komoot.com/tour/${tourId}`
    });
  }
  
  return routes;
}

// Helper: Expand Mapy.cz short URL to full URL with route ID
async function expandMapyShortUrl(shortUrl: string): Promise<{ fullUrl: string; routeId: string | null }> {
  try {
    console.log(`Expanding short URL: ${shortUrl}`);
    
    // Follow redirects manually to get the final URL
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Get the final URL after redirects
    const fullUrl = response.url;
    console.log(`Expanded to: ${fullUrl}`);
    
    // Extract route ID from full URL
    // Pattern: planovac-trasy&id=XXXXX or vlastni-body&id=XXXXX
    const idMatch = fullUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const routeId = idMatch ? idMatch[1] : null;
    
    return { fullUrl, routeId };
  } catch (error) {
    console.error(`Failed to expand short URL ${shortUrl}:`, error);
    return { fullUrl: shortUrl, routeId: null };
  }
}

// Helper: Extract metadata from Mapy.cz page HTML
function extractMapyMetadata(html: string): { title?: string; distance_km?: number; elevation_m?: number } {
  let title: string | undefined;
  let distance_km: number | undefined;
  let elevation_m: number | undefined;
  
  // Extract title from various sources
  const titlePatterns = [
    /<title[^>]*>([^<]+)<\/title>/i,
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="title"[^>]*content="([^"]+)"/i,
    /data-route-name="([^"]+)"/i,
    /"routeName"\s*:\s*"([^"]+)"/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      title = match[1].trim()
        .replace(/\s*[|–-]\s*Mapy\.cz.*$/i, '')
        .replace(/\s*[|–-]\s*Plánovač tras.*$/i, '')
        .replace(/Mapy\.cz\s*[|–-]?\s*/i, '')
        .trim();
      if (title && title.length > 2 && !title.toLowerCase().includes('mapy')) {
        break;
      }
    }
  }
  
  // Extract distance - look for route summary data
  const distancePatterns = [
    /(?:délka|distance|length)[:\s]*(\d+[.,]?\d*)\s*km/i,
    /"distance"\s*:\s*(\d+[.,]?\d*)/i,
    /"length"\s*:\s*(\d+)/i, // meters
    /(\d+[.,]?\d*)\s*km(?:\s|<|$)/i
  ];
  
  for (const pattern of distancePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let dist = parseFloat(match[1].replace(',', '.').replace(/\s/g, ''));
      // If matched "length" in meters, convert to km
      if (pattern.source.includes('length') && dist > 1000) {
        dist = dist / 1000;
      }
      if (dist > 0 && dist < 10000) {
        distance_km = Math.round(dist * 10) / 10;
        break;
      }
    }
  }
  
  // Extract elevation - look for ascent data
  const elevationPatterns = [
    /(?:převýšení|stoupání|ascent|elevation)[:\s]*(\d[\d\s]*)\s*m/i,
    /"ascent"\s*:\s*(\d+)/i,
    /"elevation"\s*:\s*(\d+)/i,
    /(\d[\d\s]+)\s*m\s*(?:převýšení|↑|stoupání)/i
  ];
  
  for (const pattern of elevationPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const elev = parseInt(match[1].replace(/\s/g, ''), 10);
      if (elev > 0 && elev < 50000) {
        elevation_m = elev;
        break;
      }
    }
  }
  
  return { title, distance_km, elevation_m };
}

async function parseMapyCz(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Mapy.cz page...');
  console.log(`Base URL: ${baseUrl}`);
  
  // Check if this is a direct short URL (mapy.cz/s/xxxxx or mapy.com/s/xxxxx)
  const shortUrlMatch = baseUrl.match(/mapy\.(?:cz|com)\/s\/([a-zA-Z0-9]+)/i);
  
  if (shortUrlMatch) {
    console.log(`Detected short URL with ID: ${shortUrlMatch[1]}`);
    
    // Expand the short URL to get the full URL with route ID
    const { fullUrl, routeId } = await expandMapyShortUrl(baseUrl);
    
    // Extract metadata from the fetched HTML
    const metadata = extractMapyMetadata(html);
    
    let gpxUrl: string | undefined;
    let title = metadata.title || `Mapy.cz Trasa`;
    
    if (routeId) {
      gpxUrl = `https://mapy.cz/route/gpx?id=${routeId}`;
      console.log(`Generated GPX URL: ${gpxUrl}`);
    }
    
    // If we still don't have title, try to get it from the expanded URL page
    if (!metadata.title && fullUrl !== baseUrl) {
      try {
        const expandedResponse = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        if (expandedResponse.ok) {
          const expandedHtml = await expandedResponse.text();
          const expandedMetadata = extractMapyMetadata(expandedHtml);
          if (expandedMetadata.title) title = expandedMetadata.title;
          if (!metadata.distance_km && expandedMetadata.distance_km) metadata.distance_km = expandedMetadata.distance_km;
          if (!metadata.elevation_m && expandedMetadata.elevation_m) metadata.elevation_m = expandedMetadata.elevation_m;
        }
      } catch (e) {
        console.error('Failed to fetch expanded URL for metadata:', e);
      }
    }
    
    const route: ParsedRoute = {
      id: `mapycz-${routeId || shortUrlMatch[1]}`,
      title,
      distance_km: metadata.distance_km,
      elevation_m: metadata.elevation_m,
      gpx_url: gpxUrl,
      gpx_accessible: false,
      route_link: fullUrl
    };
    
    // Test GPX accessibility
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
      console.log(`GPX accessible: ${route.gpx_accessible}`);
    }
    
    routes.push(route);
    return routes;
  }
  
  // Check for full URL with route ID
  const fullUrlIdMatch = baseUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fullUrlIdMatch) {
    const routeId = fullUrlIdMatch[1];
    const metadata = extractMapyMetadata(html);
    
    const route: ParsedRoute = {
      id: `mapycz-${routeId}`,
      title: metadata.title || `Mapy.cz Trasa ${routeId.substring(0, 8)}`,
      distance_km: metadata.distance_km,
      elevation_m: metadata.elevation_m,
      gpx_url: `https://mapy.cz/route/gpx?id=${routeId}`,
      gpx_accessible: false,
      route_link: baseUrl
    };
    
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
    
    routes.push(route);
    return routes;
  }
  
  // Fallback: Parse HTML for multiple routes on a page
  const routeIds = new Set<string>();
  
  // Pattern 1: ID in URL parameter
  const idPattern = /[?&]id=([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = idPattern.exec(html)) !== null) {
    routeIds.add(match[1]);
  }
  
  // Pattern 2: Shortened URL IDs (mapy.cz/s/xxxxx or mapy.com/s/xxxxx)
  const shortUrlPattern = /mapy\.(?:cz|com)\/s\/([a-zA-Z0-9]+)/gi;
  const shortUrls: string[] = [];
  while ((match = shortUrlPattern.exec(html)) !== null) {
    shortUrls.push(match[1]);
  }
  
  console.log(`Found ${routeIds.size} route IDs and ${shortUrls.length} short URLs in page`);
  
  // Process short URLs found in page
  for (const shortId of shortUrls) {
    const shortUrl = `https://mapy.cz/s/${shortId}`;
    const { fullUrl, routeId } = await expandMapyShortUrl(shortUrl);
    
    if (routeId && !routeIds.has(routeId)) {
      routes.push({
        id: `mapycz-${routeId}`,
        title: `Mapy.cz Trasa`,
        gpx_url: `https://mapy.cz/route/gpx?id=${routeId}`,
        gpx_accessible: false,
        route_link: fullUrl
      });
    }
  }
  
  // Process route IDs
  for (const routeId of routeIds) {
    if (routes.find(r => r.id === `mapycz-${routeId}`)) continue;
    
    routes.push({
      id: `mapycz-${routeId}`,
      title: `Mapy.cz Trasa ${routeId.substring(0, 8)}`,
      gpx_url: `https://mapy.cz/route/gpx?id=${routeId}`,
      gpx_accessible: false,
      route_link: `https://mapy.cz/turisticka?planovac-trasy&id=${routeId}`
    });
  }
  
  // Test GPX accessibility for all routes
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
      console.log(`GPX ${route.gpx_url} accessible: ${route.gpx_accessible}`);
    }
  }
  
  return routes;
}

async function parseWikiloc(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Wikiloc page...');
  
  // Wikiloc trail pattern: /wikiloc/view.do?id=12345 or /trails/cycling/xxx-12345
  const trailIds = new Set<string>();
  
  // Pattern 1: view.do?id=
  const viewIdPattern = /view\.do\?id=(\d+)/g;
  let match;
  while ((match = viewIdPattern.exec(html)) !== null) {
    trailIds.add(match[1]);
  }
  
  // Pattern 2: trails URL with ID at end
  const trailsPattern = /\/trails\/[^\/]+\/[^\/]+-(\d+)/g;
  while ((match = trailsPattern.exec(html)) !== null) {
    trailIds.add(match[1]);
  }
  
  // Pattern 3: Direct trail ID in data attributes
  const dataIdPattern = /data-trail-id="(\d+)"/g;
  while ((match = dataIdPattern.exec(html)) !== null) {
    trailIds.add(match[1]);
  }
  
  console.log(`Found ${trailIds.size} Wikiloc trail IDs`);
  
  for (const trailId of trailIds) {
    let title = `Wikiloc Trail ${trailId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    let description: string | undefined;
    
    // Try to extract details from surrounding HTML
    const trailSection = html.match(new RegExp(`[\\s\\S]{0,1000}(?:id=|-)${trailId}[\\s\\S]{0,1000}`, 'i'));
    if (trailSection) {
      const section = trailSection[0];
      
      // Title
      const titleMatch = section.match(/(?:data-title|title|alt)="([^"]+)"/i) ||
                        section.match(/<h[1-3][^>]*>([^<]{5,80})<\/h[1-3]>/i) ||
                        section.match(/<a[^>]*>[^<]*([A-Za-zÁ-Žá-ž0-9][^<]{5,60})[^<]*<\/a>/i);
      if (titleMatch && !titleMatch[1].includes('wikiloc')) {
        title = titleMatch[1].trim();
      }
      
      // Distance - Wikiloc uses km
      const distMatch = section.match(/([\d,.]+)\s*km/i);
      if (distMatch) {
        distance_km = parseFloat(distMatch[1].replace(',', '.'));
      }
      
      // Elevation
      const elevMatch = section.match(/(?:elevation|↑|gain|D\+)[:\s]*([\d,.\s]+)\s*m/i) ||
                       section.match(/([\d,.]+)\s*m\s*(?:↑|D\+|gain)/i);
      if (elevMatch) {
        elevation_m = parseInt(elevMatch[1].replace(/[,.\s]/g, ''), 10);
      }
      
      // Cover image
      const imgMatch = section.match(/src="([^"]*(?:wikiloc|static)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1].startsWith('//') ? `https:${imgMatch[1]}` : imgMatch[1];
      }
      
      // Description
      const descMatch = section.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{10,200})/i);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }
    
    routes.push({
      id: `wikiloc-${trailId}`,
      title,
      description,
      distance_km,
      elevation_m,
      gpx_url: `https://www.wikiloc.com/wikiloc/download.do?id=${trailId}`,
      gpx_accessible: false, // Wikiloc requires auth for GPX
      cover_url: coverUrl,
      route_link: `https://www.wikiloc.com/wikiloc/view.do?id=${trailId}`
    });
  }
  
  // Test GPX accessibility
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
  }
  
  return routes;
}

async function parseGarminConnect(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Garmin Connect page...');
  
  // Garmin Connect patterns:
  // /modern/course/12345678 or /course/view/12345678
  // /modern/activity/12345678
  const courseIds = new Set<string>();
  const activityIds = new Set<string>();
  
  // Course patterns
  const coursePattern = /\/(?:modern\/)?course(?:\/view)?\/(\d+)/g;
  let match;
  while ((match = coursePattern.exec(html)) !== null) {
    courseIds.add(match[1]);
  }
  
  // Activity patterns
  const activityPattern = /\/(?:modern\/)?activity\/(\d+)/g;
  while ((match = activityPattern.exec(html)) !== null) {
    activityIds.add(match[1]);
  }
  
  // Data attributes
  const dataPattern = /data-(?:course|activity)-id="(\d+)"/g;
  while ((match = dataPattern.exec(html)) !== null) {
    courseIds.add(match[1]);
  }
  
  console.log(`Found ${courseIds.size} courses and ${activityIds.size} activities on Garmin Connect`);
  
  // Process courses
  for (const courseId of courseIds) {
    let title = `Garmin Course ${courseId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    
    const courseSection = html.match(new RegExp(`[\\s\\S]{0,800}course[^>]*${courseId}[\\s\\S]{0,800}`, 'i'));
    if (courseSection) {
      const section = courseSection[0];
      
      // Title
      const titleMatch = section.match(/(?:data-name|courseName|title)="([^"]+)"/i) ||
                        section.match(/<h[1-3][^>]*>([^<]{3,60})<\/h[1-3]>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      // Distance
      const distMatch = section.match(/([\d,.]+)\s*(?:km|mi)/i);
      if (distMatch) {
        const value = parseFloat(distMatch[1].replace(',', '.'));
        distance_km = distMatch[0].toLowerCase().includes('mi') ? Math.round(value * 1.60934) : value;
      }
      
      // Elevation
      const elevMatch = section.match(/([\d,]+)\s*(?:m|ft)\s*(?:↑|gain|elevation)/i);
      if (elevMatch) {
        const value = parseInt(elevMatch[1].replace(',', ''), 10);
        elevation_m = elevMatch[0].toLowerCase().includes('ft') ? Math.round(value * 0.3048) : value;
      }
      
      // Cover image
      const imgMatch = section.match(/src="([^"]*(?:garmin|connect)[^"]*\.(?:jpg|png|jpeg)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
    }
    
    routes.push({
      id: `garmin-course-${courseId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: `https://connect.garmin.com/modern/proxy/course-service/course/${courseId}/gpx`,
      gpx_accessible: false, // Garmin requires auth
      cover_url: coverUrl,
      route_link: `https://connect.garmin.com/modern/course/${courseId}`
    });
  }
  
  // Process activities
  for (const activityId of activityIds) {
    let title = `Garmin Activity ${activityId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    
    const actSection = html.match(new RegExp(`[\\s\\S]{0,800}activity[^>]*${activityId}[\\s\\S]{0,800}`, 'i'));
    if (actSection) {
      const section = actSection[0];
      
      const titleMatch = section.match(/(?:data-name|activityName|title)="([^"]+)"/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      const distMatch = section.match(/([\d,.]+)\s*(?:km|mi)/i);
      if (distMatch) {
        const value = parseFloat(distMatch[1].replace(',', '.'));
        distance_km = distMatch[0].toLowerCase().includes('mi') ? Math.round(value * 1.60934) : value;
      }
      
      const elevMatch = section.match(/([\d,]+)\s*(?:m|ft)/i);
      if (elevMatch) {
        const value = parseInt(elevMatch[1].replace(',', ''), 10);
        elevation_m = elevMatch[0].toLowerCase().includes('ft') ? Math.round(value * 0.3048) : value;
      }
    }
    
    routes.push({
      id: `garmin-activity-${activityId}`,
      title,
      description: 'Garmin activity (recorded ride)',
      distance_km,
      elevation_m,
      gpx_url: `https://connect.garmin.com/modern/proxy/download-service/export/gpx/activity/${activityId}`,
      gpx_accessible: false, // Garmin requires auth
      route_link: `https://connect.garmin.com/modern/activity/${activityId}`
    });
  }
  
  // Test GPX accessibility
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
  }
  
  return routes;
}

async function parseAllTrails(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing AllTrails page...');
  
  // AllTrails trail patterns:
  // /trail/czech-republic/xxx--trail-name
  // /explore/trail/czech-republic/xxx
  // /trail/xxx (numeric ID)
  const trailSlugs = new Set<string>();
  
  // Pattern 1: Full trail URLs with country/region
  const trailPattern = /\/trail\/([a-z-]+\/[a-z0-9-]+)/gi;
  let match;
  while ((match = trailPattern.exec(html)) !== null) {
    trailSlugs.add(match[1]);
  }
  
  // Pattern 2: Explore trail URLs
  const explorePattern = /\/explore\/trail\/([a-z-]+\/[a-z0-9-]+)/gi;
  while ((match = explorePattern.exec(html)) !== null) {
    trailSlugs.add(match[1]);
  }
  
  // Pattern 3: Data attributes
  const dataPattern = /data-trail-(?:slug|id)="([^"]+)"/g;
  while ((match = dataPattern.exec(html)) !== null) {
    trailSlugs.add(match[1]);
  }
  
  console.log(`Found ${trailSlugs.size} AllTrails trails`);
  
  for (const trailSlug of trailSlugs) {
    let title = trailSlug.split('/').pop()?.replace(/-/g, ' ') || `AllTrails Trail`;
    title = title.charAt(0).toUpperCase() + title.slice(1);
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    let description: string | undefined;
    
    // Try to extract details from surrounding HTML
    const slugEscaped = trailSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trailSection = html.match(new RegExp(`[\\s\\S]{0,1200}${slugEscaped}[\\s\\S]{0,1200}`, 'i'));
    if (trailSection) {
      const section = trailSection[0];
      
      // Better title
      const titleMatch = section.match(/(?:data-title|itemprop="name"|aria-label)="([^"]+)"/i) ||
                        section.match(/<h[1-3][^>]*>([^<]{5,80})<\/h[1-3]>/i);
      if (titleMatch && !titleMatch[1].toLowerCase().includes('alltrails')) {
        title = titleMatch[1].trim();
      }
      
      // Distance - AllTrails uses miles primarily
      const distMiMatch = section.match(/([\d.]+)\s*mi(?:les?)?/i);
      const distKmMatch = section.match(/([\d.]+)\s*km/i);
      if (distKmMatch) {
        distance_km = parseFloat(distKmMatch[1]);
      } else if (distMiMatch) {
        distance_km = Math.round(parseFloat(distMiMatch[1]) * 1.60934 * 10) / 10;
      }
      
      // Elevation - AllTrails uses feet primarily
      const elevFtMatch = section.match(/([\d,]+)\s*ft\s*(?:elevation|gain)?/i);
      const elevMMatch = section.match(/([\d,]+)\s*m\s*(?:elevation|gain|↑)/i);
      if (elevMMatch) {
        elevation_m = parseInt(elevMMatch[1].replace(/,/g, ''), 10);
      } else if (elevFtMatch) {
        elevation_m = Math.round(parseInt(elevFtMatch[1].replace(/,/g, ''), 10) * 0.3048);
      }
      
      // Cover image
      const imgMatch = section.match(/src="([^"]*(?:alltrails|cloudfront)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
      
      // Description
      const descMatch = section.match(/(?:itemprop="description"|class="[^"]*description[^"]*")[^>]*>([^<]{10,200})/i);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }
    
    routes.push({
      id: `alltrails-${trailSlug.replace(/\//g, '-')}`,
      title,
      description,
      distance_km,
      elevation_m,
      gpx_url: undefined, // AllTrails requires Pro subscription for GPX
      gpx_accessible: false,
      cover_url: coverUrl,
      route_link: `https://www.alltrails.com/trail/${trailSlug}`
    });
  }
  
  // Test GPX accessibility
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
  }
  
  return routes;
}

async function parseTrailforks(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Trailforks page...');
  
  // Trailforks patterns:
  // /trail/12345/ or /trails/trail-name/
  // /route/12345/
  // /ridelog/12345/
  const trailIds = new Set<string>();
  const routeIds = new Set<string>();
  
  // Pattern 1: Numeric trail IDs
  const trailIdPattern = /\/trail\/(\d+)/g;
  let match;
  while ((match = trailIdPattern.exec(html)) !== null) {
    trailIds.add(match[1]);
  }
  
  // Pattern 2: Trail slugs
  const trailSlugPattern = /\/trails\/([a-z0-9-]+)/gi;
  while ((match = trailSlugPattern.exec(html)) !== null) {
    if (!match[1].match(/^\d+$/)) { // Skip numeric-only (already captured)
      trailIds.add(`slug-${match[1]}`);
    }
  }
  
  // Pattern 3: Route IDs
  const routePattern = /\/route\/(\d+)/g;
  while ((match = routePattern.exec(html)) !== null) {
    routeIds.add(match[1]);
  }
  
  // Pattern 4: Data attributes
  const dataPattern = /data-(?:trail|route)-id="(\d+)"/g;
  while ((match = dataPattern.exec(html)) !== null) {
    trailIds.add(match[1]);
  }
  
  console.log(`Found ${trailIds.size} trails and ${routeIds.size} routes on Trailforks`);
  
  // Process trails
  for (const trailId of trailIds) {
    const isSlug = trailId.startsWith('slug-');
    const cleanId = isSlug ? trailId.replace('slug-', '') : trailId;
    let title = isSlug ? cleanId.replace(/-/g, ' ') : `Trailforks Trail ${cleanId}`;
    if (isSlug) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    let difficulty: string | undefined;
    
    const trailSection = html.match(new RegExp(`[\\s\\S]{0,1000}(?:trail|trails)\\/(?:${cleanId}|${trailId.replace('slug-', '')})[\\s\\S]{0,1000}`, 'i'));
    if (trailSection) {
      const section = trailSection[0];
      
      // Title
      const titleMatch = section.match(/(?:data-title|title)="([^"]+)"/i) ||
                        section.match(/<h[1-3][^>]*>([^<]{3,60})<\/h[1-3]>/i);
      if (titleMatch && !titleMatch[1].toLowerCase().includes('trailforks')) {
        title = titleMatch[1].trim();
      }
      
      // Distance
      const distMatch = section.match(/([\d.]+)\s*(?:km|mi)/i);
      if (distMatch) {
        const value = parseFloat(distMatch[1]);
        distance_km = distMatch[0].toLowerCase().includes('mi') ? Math.round(value * 1.60934 * 10) / 10 : value;
      }
      
      // Elevation
      const elevMatch = section.match(/([\d,]+)\s*(?:m|ft)\s*(?:↑|climb|gain|descent)/i);
      if (elevMatch) {
        const value = parseInt(elevMatch[1].replace(/,/g, ''), 10);
        elevation_m = elevMatch[0].toLowerCase().includes('ft') ? Math.round(value * 0.3048) : value;
      }
      
      // Difficulty (Trailforks uses color ratings)
      const diffMatch = section.match(/(?:difficulty|rating)[^>]*(?:green|blue|black|double-black|proline)/i);
      if (diffMatch) {
        difficulty = diffMatch[0].toLowerCase().includes('green') ? 'easy' :
                    diffMatch[0].toLowerCase().includes('blue') ? 'medium' : 'hard';
      }
      
      // Cover image
      const imgMatch = section.match(/src="([^"]*(?:trailforks|pinkbike)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
    }
    
    const routeLink = isSlug 
      ? `https://www.trailforks.com/trails/${cleanId}/`
      : `https://www.trailforks.com/trail/${cleanId}/`;
    
    routes.push({
      id: `trailforks-trail-${cleanId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: isSlug ? undefined : `https://www.trailforks.com/trail/${cleanId}/gpx/`,
      gpx_accessible: false, // Trailforks requires login
      cover_url: coverUrl,
      route_link: routeLink
    });
  }
  
  // Process routes
  for (const routeId of routeIds) {
    let title = `Trailforks Route ${routeId}`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    
    const routeSection = html.match(new RegExp(`[\\s\\S]{0,800}route\\/${routeId}[\\s\\S]{0,800}`, 'i'));
    if (routeSection) {
      const section = routeSection[0];
      
      const titleMatch = section.match(/(?:data-title|title)="([^"]+)"/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      const distMatch = section.match(/([\d.]+)\s*(?:km|mi)/i);
      if (distMatch) {
        const value = parseFloat(distMatch[1]);
        distance_km = distMatch[0].toLowerCase().includes('mi') ? Math.round(value * 1.60934 * 10) / 10 : value;
      }
      
      const elevMatch = section.match(/([\d,]+)\s*(?:m|ft)/i);
      if (elevMatch) {
        const value = parseInt(elevMatch[1].replace(/,/g, ''), 10);
        elevation_m = elevMatch[0].toLowerCase().includes('ft') ? Math.round(value * 0.3048) : value;
      }
      
      const imgMatch = section.match(/src="([^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1];
      }
    }
    
    routes.push({
      id: `trailforks-route-${routeId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: `https://www.trailforks.com/route/${routeId}/gpx/`,
      gpx_accessible: false,
      cover_url: coverUrl,
      route_link: `https://www.trailforks.com/route/${routeId}/`
    });
  }
  
  // Test GPX accessibility
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
  }
  
  return routes;
}

async function parseGenericPage(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Using generic parser...');
  
  // Look for common patterns of route listings
  // Pattern 1: Links with GPX references
  const gpxLinkPattern = /<a[^>]*href="([^"]+)"[^>]*>[^<]*(?:trasa|route|gpx|download)[^<]*<\/a>/gi;
  const gpxLinks = [...html.matchAll(gpxLinkPattern)];
  
  for (let i = 0; i < gpxLinks.length; i++) {
    const link = gpxLinks[i][1];
    const fullUrl = link.startsWith('http') ? link : new URL(link, baseUrl).href;
    
    // Try to get a better title from the link text
    const linkText = gpxLinks[i][0].match(/>([^<]+)</)?.[1]?.trim() || `Trasa ${i + 1}`;
    
    routes.push({
      id: `generic-${i}`,
      title: linkText,
      gpx_url: fullUrl.endsWith('.gpx') ? fullUrl : undefined,
      gpx_accessible: false,
      route_link: fullUrl
    });
  }
  
  // Pattern 2: Look for RideWithGPS, Strava, Komoot embeds
  const rwgpsEmbed = html.match(/ridewithgps\.com\/(?:routes|embeds)\/(\d+)/gi);
  const stravaEmbed = html.match(/strava\.com\/(?:routes|segments)\/(\d+)/gi);
  const komootEmbed = html.match(/komoot\.com\/tour\/(\d+)/gi);
  
  if (rwgpsEmbed) {
    for (const embed of rwgpsEmbed) {
      const idMatch = embed.match(/(\d+)/);
      if (idMatch) {
        const routeId = idMatch[1];
        if (!routes.find(r => r.id === `rwgps-${routeId}`)) {
          routes.push({
            id: `rwgps-${routeId}`,
            title: `RideWithGPS Route ${routeId}`,
            gpx_url: `https://ridewithgps.com/routes/${routeId}.gpx`,
            gpx_accessible: false,
            route_link: `https://ridewithgps.com/routes/${routeId}`
          });
        }
      }
    }
  }
  
  if (stravaEmbed) {
    for (const embed of stravaEmbed) {
      const idMatch = embed.match(/(\d+)/);
      const typeMatch = embed.match(/(routes|segments)/);
      if (idMatch && typeMatch) {
        const id = idMatch[1];
        const type = typeMatch[1];
        routes.push({
          id: `strava-${type}-${id}`,
          title: `Strava ${type === 'routes' ? 'Route' : 'Segment'} ${id}`,
          gpx_url: type === 'routes' ? `https://www.strava.com/routes/${id}/export_gpx` : undefined,
          gpx_accessible: false,
          route_link: `https://www.strava.com/${type}/${id}`
        });
      }
    }
  }
  
  if (komootEmbed) {
    for (const embed of komootEmbed) {
      const idMatch = embed.match(/(\d+)/);
      if (idMatch) {
        const tourId = idMatch[1];
        routes.push({
          id: `komoot-${tourId}`,
          title: `Komoot Tour ${tourId}`,
          gpx_url: `https://www.komoot.com/tour/${tourId}/download`,
          gpx_accessible: false,
          route_link: `https://www.komoot.com/tour/${tourId}`
        });
      }
    }
  }
  
  // Pattern 5: Look for Mapy.cz embeds/links
  const mapyCzEmbed = html.match(/mapy\.cz\/(?:s\/([a-zA-Z0-9]+)|[^"]*[?&]id=([a-zA-Z0-9_-]+))/gi);
  if (mapyCzEmbed) {
    for (const embed of mapyCzEmbed) {
      const shortMatch = embed.match(/\/s\/([a-zA-Z0-9]+)/);
      const idMatch = embed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      
      if (shortMatch) {
        const shortId = shortMatch[1];
        if (!routes.find(r => r.id === `mapycz-short-${shortId}`)) {
          routes.push({
            id: `mapycz-short-${shortId}`,
            title: `Mapy.cz Trasa`,
            gpx_url: undefined, // Short URLs need to be resolved first
            gpx_accessible: false,
            route_link: `https://mapy.cz/s/${shortId}`
          });
        }
      } else if (idMatch) {
        const routeId = idMatch[1];
        if (!routes.find(r => r.id === `mapycz-${routeId}`)) {
          routes.push({
            id: `mapycz-${routeId}`,
            title: `Mapy.cz Trasa`,
            gpx_url: `https://mapy.cz/route/gpx?id=${routeId}`,
            gpx_accessible: false,
            route_link: `https://mapy.cz/turisticka?planovac-trasy&id=${routeId}`
          });
        }
      }
    }
  }
  
  // Pattern 6: Look for Wikiloc embeds/links
  const wikilocEmbed = html.match(/wikiloc\.com\/(?:wikiloc\/view\.do\?id=|trails\/[^\/]+\/[^-]+-)?(\d+)/gi);
  if (wikilocEmbed) {
    for (const embed of wikilocEmbed) {
      const idMatch = embed.match(/(\d+)/);
      if (idMatch) {
        const trailId = idMatch[1];
        if (!routes.find(r => r.id === `wikiloc-${trailId}`)) {
          routes.push({
            id: `wikiloc-${trailId}`,
            title: `Wikiloc Trail ${trailId}`,
            gpx_url: `https://www.wikiloc.com/wikiloc/download.do?id=${trailId}`,
            gpx_accessible: false,
            route_link: `https://www.wikiloc.com/wikiloc/view.do?id=${trailId}`
          });
        }
      }
    }
  }
  
  // Pattern 7: Look for Garmin Connect embeds/links
  const garminEmbed = html.match(/(?:connect\.)?garmin\.com\/(?:modern\/)?(?:course|activity)\/(\d+)/gi);
  if (garminEmbed) {
    for (const embed of garminEmbed) {
      const idMatch = embed.match(/(\d+)/);
      const typeMatch = embed.match(/(course|activity)/i);
      if (idMatch && typeMatch) {
        const id = idMatch[1];
        const type = typeMatch[1].toLowerCase();
        const routeId = `garmin-${type}-${id}`;
        if (!routes.find(r => r.id === routeId)) {
          const gpxUrl = type === 'course' 
            ? `https://connect.garmin.com/modern/proxy/course-service/course/${id}/gpx`
            : `https://connect.garmin.com/modern/proxy/download-service/export/gpx/activity/${id}`;
          routes.push({
            id: routeId,
            title: `Garmin ${type === 'course' ? 'Course' : 'Activity'} ${id}`,
            gpx_url: gpxUrl,
            gpx_accessible: false,
            route_link: `https://connect.garmin.com/modern/${type}/${id}`
          });
        }
      }
    }
  }
  
  // Pattern 8: Look for AllTrails embeds/links
  const alltrailsEmbed = html.match(/alltrails\.com\/(?:trail|explore\/trail)\/([a-z-]+\/[a-z0-9-]+)/gi);
  if (alltrailsEmbed) {
    for (const embed of alltrailsEmbed) {
      const slugMatch = embed.match(/(?:trail|explore\/trail)\/([a-z-]+\/[a-z0-9-]+)/i);
      if (slugMatch) {
        const slug = slugMatch[1];
        const routeId = `alltrails-${slug.replace(/\//g, '-')}`;
        if (!routes.find(r => r.id === routeId)) {
          const title = slug.split('/').pop()?.replace(/-/g, ' ') || 'AllTrails Trail';
          routes.push({
            id: routeId,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            gpx_url: undefined, // AllTrails requires Pro
            gpx_accessible: false,
            route_link: `https://www.alltrails.com/trail/${slug}`
          });
        }
      }
    }
  }
  
  // Pattern 9: Look for Trailforks embeds/links
  const trailforksEmbed = html.match(/trailforks\.com\/(?:trail|route|trails)\/([a-z0-9-]+)/gi);
  if (trailforksEmbed) {
    for (const embed of trailforksEmbed) {
      const idMatch = embed.match(/\/(\d+)/);
      const slugMatch = embed.match(/(?:trail|trails)\/([a-z0-9-]+)/i);
      if (idMatch) {
        const id = idMatch[1];
        const isRoute = embed.includes('/route/');
        const routeId = isRoute ? `trailforks-route-${id}` : `trailforks-trail-${id}`;
        if (!routes.find(r => r.id === routeId)) {
          routes.push({
            id: routeId,
            title: `Trailforks ${isRoute ? 'Route' : 'Trail'} ${id}`,
            gpx_url: `https://www.trailforks.com/${isRoute ? 'route' : 'trail'}/${id}/gpx/`,
            gpx_accessible: false,
            route_link: `https://www.trailforks.com/${isRoute ? 'route' : 'trail'}/${id}/`
          });
        }
      } else if (slugMatch && !slugMatch[1].match(/^\d+$/)) {
        const slug = slugMatch[1];
        const routeId = `trailforks-trail-${slug}`;
        if (!routes.find(r => r.id === routeId)) {
          const title = slug.replace(/-/g, ' ');
          routes.push({
            id: routeId,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            gpx_url: undefined,
            gpx_accessible: false,
            route_link: `https://www.trailforks.com/trails/${slug}/`
          });
        }
      }
    }
  }
  
  // Test accessibility for found GPX URLs
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
    }
  }
  
  return routes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing URL: ${url}`);

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'cs,en;q=0.9'
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch URL: ${response.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes of HTML`);

    let routes: ParsedRoute[] = [];

    // Detect site type and use appropriate parser
    if (url.includes('bicycle.holiday')) {
      routes = await parseBicycleHoliday(html, url);
    } else if (url.includes('ridewithgps.com')) {
      routes = await parseRideWithGps(html, url);
    } else if (url.includes('strava.com')) {
      routes = await parseStrava(html, url);
    } else if (url.includes('komoot.com')) {
      routes = await parseKomoot(html, url);
    } else if (url.includes('mapy.cz') || url.includes('mapy.com')) {
      routes = await parseMapyCz(html, url);
    } else if (url.includes('wikiloc.com')) {
      routes = await parseWikiloc(html, url);
    } else if (url.includes('garmin.com') || url.includes('connect.garmin')) {
      routes = await parseGarminConnect(html, url);
    } else if (url.includes('alltrails.com')) {
      routes = await parseAllTrails(html, url);
    } else if (url.includes('trailforks.com')) {
      routes = await parseTrailforks(html, url);
    } else {
      routes = await parseGenericPage(html, url);
    }

    console.log(`Parsed ${routes.length} routes`);

    return new Response(
      JSON.stringify({ success: true, routes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error analyzing page:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
