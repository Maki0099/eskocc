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
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.ok;
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
  
  // Match article cards with route information
  const articlePattern = /<article[^>]*class="[^"]*elementor-post[^"]*"[^>]*>[\s\S]*?<\/article>/gi;
  const articles = html.match(articlePattern) || [];
  
  console.log(`Found ${articles.length} article elements`);
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    // Extract title and link
    const titleMatch = article.match(/<h3[^>]*class="[^"]*elementor-post__title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!titleMatch) continue;
    
    const routeLink = titleMatch[1];
    const title = titleMatch[2].trim();
    
    // Extract cover image
    const imgMatch = article.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
    const coverUrl = imgMatch ? imgMatch[1] : undefined;
    
    // Extract description/excerpt
    const excerptMatch = article.match(/<div[^>]*class="[^"]*elementor-post__excerpt[^"]*"[^>]*>[\s\S]*?<p>([^<]+)<\/p>/i);
    const description = excerptMatch ? excerptMatch[1].trim() : undefined;
    
    // Try to extract distance and elevation from title or description
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    
    // Pattern: "XX km" or "XXX m"
    const distanceMatch = (title + ' ' + (description || '')).match(/(\d+)\s*km/i);
    const elevationMatch = (title + ' ' + (description || '')).match(/(\d+)\s*m\b(?!\s*km)/i);
    
    if (distanceMatch) distance_km = parseInt(distanceMatch[1], 10);
    if (elevationMatch) elevation_m = parseInt(elevationMatch[1], 10);
    
    // Generate a unique ID
    const id = `bh-${i}-${title.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
    
    routes.push({
      id,
      title,
      description,
      distance_km,
      elevation_m,
      gpx_url: undefined, // Will need to fetch from detail page
      gpx_accessible: false,
      cover_url: coverUrl,
      route_link: routeLink
    });
  }
  
  // For each route, try to fetch the detail page to get GPX link
  for (const route of routes) {
    if (route.route_link) {
      try {
        console.log(`Fetching detail page: ${route.route_link}`);
        const detailResponse = await fetch(route.route_link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (detailResponse.ok) {
          const detailHtml = await detailResponse.text();
          
          // Look for GPX download link - various patterns
          const gpxPatterns = [
            /href="([^"]+\.gpx)"/i,
            /href="([^"]+gpx[^"]*)"/i,
            /data-gpx="([^"]+)"/i,
            /ridewithgps\.com\/routes\/(\d+)/i
          ];
          
          for (const pattern of gpxPatterns) {
            const gpxMatch = detailHtml.match(pattern);
            if (gpxMatch) {
              if (pattern.source.includes('ridewithgps')) {
                route.gpx_url = `https://ridewithgps.com/routes/${gpxMatch[1]}.gpx`;
              } else {
                route.gpx_url = gpxMatch[1].startsWith('http') ? gpxMatch[1] : new URL(gpxMatch[1], route.route_link).href;
              }
              break;
            }
          }
          
          // Extract distance and elevation from detail page if not found
          if (!route.distance_km) {
            const distMatch = detailHtml.match(/(\d+)\s*km/i);
            if (distMatch) route.distance_km = parseInt(distMatch[1], 10);
          }
          if (!route.elevation_m) {
            const elevMatch = detailHtml.match(/převýšení[:\s]*(\d+)\s*m/i) || 
                             detailHtml.match(/elevation[:\s]*(\d+)\s*m/i) ||
                             detailHtml.match(/(\d{3,4})\s*m\s*(?:převýšení|elevation|↑)/i);
            if (elevMatch) route.elevation_m = parseInt(elevMatch[1], 10);
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

async function parseMapyCz(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  console.log('Parsing Mapy.cz page...');
  
  // Mapy.cz route patterns:
  // 1. Short URLs: https://mapy.cz/s/xxxxx
  // 2. Full URLs with route ID: planovac-trasy&id=xxxxx or vlastni-body&id=xxxxx
  // 3. Route planning URLs with coordinates: &rc=...
  // 4. GPX export: https://mapy.cz/route/gpx?id=xxxxx
  
  const routeIds = new Set<string>();
  
  // Pattern 1: ID in URL parameter
  const idPattern = /[?&]id=([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = idPattern.exec(html)) !== null) {
    routeIds.add(match[1]);
  }
  
  // Pattern 2: Shortened URL IDs (mapy.cz/s/xxxxx)
  const shortUrlPattern = /mapy\.cz\/s\/([a-zA-Z0-9]+)/g;
  while ((match = shortUrlPattern.exec(html)) !== null) {
    routeIds.add(`short-${match[1]}`);
  }
  
  // Pattern 3: Route planner data in page
  const routeDataPattern = /data-route-id="([^"]+)"/g;
  while ((match = routeDataPattern.exec(html)) !== null) {
    routeIds.add(match[1]);
  }
  
  // Pattern 4: Look for route cards/listings with links
  const routeLinkPattern = /<a[^>]*href="([^"]*mapy\.cz[^"]*(?:planovac|trasa|vlastni-body)[^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const routeLinks = [...html.matchAll(routeLinkPattern)];
  
  console.log(`Found ${routeIds.size} route IDs and ${routeLinks.length} route links`);
  
  // Process route IDs
  for (const routeId of routeIds) {
    let title = `Mapy.cz Trasa`;
    let distance_km: number | undefined;
    let elevation_m: number | undefined;
    let coverUrl: string | undefined;
    let gpxUrl: string | undefined;
    let routeLink: string | undefined;
    
    // Check if it's a short URL
    if (routeId.startsWith('short-')) {
      const shortId = routeId.replace('short-', '');
      routeLink = `https://mapy.cz/s/${shortId}`;
      title = `Mapy.cz Trasa ${shortId}`;
    } else {
      // Regular route ID - construct GPX export URL
      gpxUrl = `https://mapy.cz/route/gpx?id=${routeId}`;
      routeLink = `https://mapy.cz/turisticka?planovac-trasy&id=${routeId}`;
      title = `Mapy.cz Trasa ${routeId.substring(0, 8)}...`;
    }
    
    // Try to extract details from surrounding HTML
    const routeSection = html.match(new RegExp(`[\\s\\S]{0,800}(?:id=|/s/)${routeId.replace('short-', '')}[\\s\\S]{0,800}`, 'i'));
    if (routeSection) {
      const section = routeSection[0];
      
      // Title - look for route name
      const titleMatch = section.match(/(?:data-name|title|aria-label)="([^"]+)"/i) ||
                        section.match(/<h[1-6][^>]*>([^<]{3,60})<\/h[1-6]>/i) ||
                        section.match(/>([A-Za-zÁ-Žá-ž0-9][^<]{5,60})</);
      if (titleMatch && !titleMatch[1].includes('mapy.cz')) {
        title = titleMatch[1].trim();
      }
      
      // Distance - Mapy.cz uses "km" format
      const distMatch = section.match(/([\d,.]+)\s*km/i);
      if (distMatch) {
        distance_km = parseFloat(distMatch[1].replace(',', '.'));
      }
      
      // Elevation - look for various patterns
      const elevMatch = section.match(/(?:převýšení|elevation|↑|stoupání)[:\s]*([\d\s]+)\s*m/i) ||
                       section.match(/([\d\s]+)\s*m\s*(?:převýšení|↑)/i);
      if (elevMatch) {
        elevation_m = parseInt(elevMatch[1].replace(/\s/g, ''), 10);
      }
      
      // Cover image - Mapy.cz static map or thumbnail
      const imgMatch = section.match(/src="([^"]*(?:mapserver|static|thumbnail)[^"]*\.(?:png|jpg|jpeg)[^"]*)"/i);
      if (imgMatch) {
        coverUrl = imgMatch[1].startsWith('//') ? `https:${imgMatch[1]}` : imgMatch[1];
      }
    }
    
    routes.push({
      id: `mapycz-${routeId}`,
      title,
      distance_km,
      elevation_m,
      gpx_url: gpxUrl,
      gpx_accessible: false, // Will test below
      cover_url: coverUrl,
      route_link: routeLink
    });
  }
  
  // Process route links found in the page
  for (let i = 0; i < routeLinks.length; i++) {
    const linkUrl = routeLinks[i][1];
    const linkText = routeLinks[i][2].trim();
    
    // Check if we already have this route
    const existingRoute = routes.find(r => r.route_link === linkUrl);
    if (existingRoute) {
      // Update title if we have better text
      if (linkText && linkText.length > 3 && !linkText.includes('mapy.cz')) {
        existingRoute.title = linkText;
      }
      continue;
    }
    
    // Extract ID from URL if possible
    const urlIdMatch = linkUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const shortIdMatch = linkUrl.match(/\/s\/([a-zA-Z0-9]+)/);
    
    let gpxUrl: string | undefined;
    if (urlIdMatch) {
      gpxUrl = `https://mapy.cz/route/gpx?id=${urlIdMatch[1]}`;
    }
    
    routes.push({
      id: `mapycz-link-${i}`,
      title: linkText || `Mapy.cz Trasa ${i + 1}`,
      gpx_url: gpxUrl,
      gpx_accessible: false,
      route_link: linkUrl.startsWith('http') ? linkUrl : `https://mapy.cz${linkUrl}`
    });
  }
  
  // If no routes found, check for embedded map with route
  if (routes.length === 0) {
    // Look for iframe embeds
    const iframeMatch = html.match(/<iframe[^>]*src="([^"]*mapy\.cz[^"]*)"/i);
    if (iframeMatch) {
      const embedUrl = iframeMatch[1];
      const embedIdMatch = embedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      
      routes.push({
        id: `mapycz-embed-0`,
        title: 'Mapy.cz Embedded Route',
        gpx_url: embedIdMatch ? `https://mapy.cz/route/gpx?id=${embedIdMatch[1]}` : undefined,
        gpx_accessible: false,
        route_link: embedUrl
      });
    }
    
    // Look for mapy.cz link in the current URL (if analyzing a mapy.cz page directly)
    if (baseUrl.includes('mapy.cz')) {
      const urlIdMatch = baseUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const shortMatch = baseUrl.match(/\/s\/([a-zA-Z0-9]+)/);
      
      if (urlIdMatch || shortMatch) {
        const routeId = urlIdMatch ? urlIdMatch[1] : shortMatch![1];
        routes.push({
          id: `mapycz-current-${routeId}`,
          title: 'Aktuální trasa',
          gpx_url: urlIdMatch ? `https://mapy.cz/route/gpx?id=${routeId}` : undefined,
          gpx_accessible: false,
          route_link: baseUrl
        });
      }
    }
  }
  
  // Test GPX accessibility
  for (const route of routes) {
    if (route.gpx_url) {
      route.gpx_accessible = await testGpxAccessibility(route.gpx_url);
      console.log(`GPX ${route.gpx_url} accessible: ${route.gpx_accessible}`);
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
    } else if (url.includes('mapy.cz')) {
      routes = await parseMapyCz(html, url);
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
