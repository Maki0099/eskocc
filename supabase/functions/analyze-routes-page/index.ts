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

async function parseGenericPage(html: string, baseUrl: string): Promise<ParsedRoute[]> {
  const routes: ParsedRoute[] = [];
  
  // Look for common patterns of route listings
  // Pattern 1: Links with GPX references
  const gpxLinkPattern = /<a[^>]*href="([^"]+)"[^>]*>[^<]*(?:trasa|route|gpx)[^<]*<\/a>/gi;
  const gpxLinks = [...html.matchAll(gpxLinkPattern)];
  
  for (let i = 0; i < gpxLinks.length; i++) {
    const link = gpxLinks[i][1];
    const fullUrl = link.startsWith('http') ? link : new URL(link, baseUrl).href;
    
    routes.push({
      id: `generic-${i}`,
      title: `Trasa ${i + 1}`,
      gpx_url: fullUrl.endsWith('.gpx') ? fullUrl : undefined,
      gpx_accessible: false,
      route_link: fullUrl
    });
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
