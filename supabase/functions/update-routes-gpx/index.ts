import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteToUpdate {
  id: string;
  title: string;
  route_link: string;
}

interface UpdateResult {
  id: string;
  title: string;
  status: 'updated' | 'failed' | 'no_gpx_found';
  gpx_url?: string;
  error?: string;
}

async function downloadGpx(url: string): Promise<ArrayBuffer | null> {
  try {
    console.log(`Attempting to download GPX from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`GPX download failed with status ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    
    // Verify it's actually GPX content
    if (!text.includes('<gpx') && !text.includes('<?xml')) {
      console.log(`Downloaded content is not GPX format`);
      return null;
    }
    
    console.log(`Successfully downloaded GPX (${text.length} bytes)`);
    return new TextEncoder().encode(text).buffer;
  } catch (error) {
    console.error(`Error downloading GPX from ${url}:`, error);
    return null;
  }
}

async function extractRideWithGpsId(pageUrl: string): Promise<string | null> {
  try {
    console.log(`Fetching page to find RideWithGPS route ID: ${pageUrl}`);
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`Page fetch failed with status ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Look for RideWithGPS route IDs in various patterns
    const patterns = [
      /ridewithgps\.com\/routes\/(\d+)/gi,
      /ridewithgps\.com\/embeds\?id=(\d+)/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        const routeId = matches[0][1];
        console.log(`Found RideWithGPS route ID: ${routeId}`);
        return routeId;
      }
    }
    
    console.log('No RideWithGPS route ID found in page');
    return null;
  } catch (error) {
    console.error(`Error fetching page ${pageUrl}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all routes without GPX that have a route_link
    const { data: routesWithoutGpx, error: fetchError } = await supabase
      .from('favorite_routes')
      .select('id, title, route_link')
      .is('gpx_file_url', null)
      .not('route_link', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch routes: ${fetchError.message}`);
    }

    if (!routesWithoutGpx || routesWithoutGpx.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No routes need GPX updates', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${routesWithoutGpx.length} routes without GPX`);

    const results: UpdateResult[] = [];
    let updated = 0;
    let failed = 0;

    for (const route of routesWithoutGpx as RouteToUpdate[]) {
      console.log(`\n--- Processing: ${route.title} ---`);
      console.log(`Route link: ${route.route_link}`);

      let gpxData: ArrayBuffer | null = null;

      // Check if route_link contains bicycle.holiday - scrape for RideWithGPS ID
      if (route.route_link.includes('bicycle.holiday')) {
        const rwgpsId = await extractRideWithGpsId(route.route_link);
        
        if (rwgpsId) {
          // Download GPX directly from RideWithGPS
          const gpxUrl = `https://ridewithgps.com/routes/${rwgpsId}.gpx`;
          gpxData = await downloadGpx(gpxUrl);
        }
      }

      if (!gpxData) {
        console.log(`No GPX found for: ${route.title}`);
        results.push({
          id: route.id,
          title: route.title,
          status: 'no_gpx_found'
        });
        failed++;
        continue;
      }

      // Upload GPX to storage
      const gpxFilename = `${route.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gpx`;
      const gpxPath = `gpx/${Date.now()}-${gpxFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('routes')
        .upload(gpxPath, gpxData, {
          contentType: 'application/gpx+xml',
          upsert: false
        });

      if (uploadError) {
        console.error(`Upload error for ${route.title}:`, uploadError);
        results.push({
          id: route.id,
          title: route.title,
          status: 'failed',
          error: uploadError.message
        });
        failed++;
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from('routes').getPublicUrl(gpxPath);

      // Update route with GPX URL
      const { error: updateError } = await supabase
        .from('favorite_routes')
        .update({ gpx_file_url: publicUrl })
        .eq('id', route.id);

      if (updateError) {
        console.error(`Update error for ${route.title}:`, updateError);
        results.push({
          id: route.id,
          title: route.title,
          status: 'failed',
          error: updateError.message
        });
        failed++;
        continue;
      }

      console.log(`Successfully updated GPX for: ${route.title}`);
      results.push({
        id: route.id,
        title: route.title,
        status: 'updated',
        gpx_url: publicUrl
      });
      updated++;
    }

    console.log(`\n=== Complete: ${updated} updated, ${failed} failed ===`);

    return new Response(
      JSON.stringify({
        success: true,
        total: routesWithoutGpx.length,
        updated,
        failed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in update-routes-gpx:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
