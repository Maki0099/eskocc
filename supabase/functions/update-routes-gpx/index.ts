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
  rwgps_id?: string;
  error?: string;
}

// Direct mapping: page_id → RideWithGPS route ID
const PAGE_TO_RWGPS: Record<string, string> = {
  '1108': '32433475',  // Route 100
  '1183': '32433476',  // Route 101
  '1968': '32476757',  // Route 102
  '1186': '32433478',  // Route 103
  '1189': '32484270',  // Route 104
  '1977': '32476952',  // Route 105
  '1985': '32477068',  // Route 106
  '1994': '32477321',  // Route 107
  '1192': '32433481',  // Route 108
  '1195': '32433482',  // Route 109
  '1198': '32433483',  // Route 110
  '1201': '32433484',  // Route 111
  '1204': '32433485',  // Route 112
};

function extractPageId(url: string): string | null {
  const match = url.match(/page_id=(\d+)/);
  return match ? match[1] : null;
}

function extractRouteNumber(title: string): string {
  const match = title.match(/^(\d+)\s*[–-]/);
  return match ? match[1] : 'unknown';
}

async function downloadGpx(rwgpsId: string): Promise<ArrayBuffer | null> {
  const url = `https://ridewithgps.com/routes/${rwgpsId}.gpx`;
  try {
    console.log(`Downloading GPX from: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) {
      console.log(`GPX download failed with status ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    
    if (!text.includes('<gpx') && !text.includes('<?xml')) {
      console.log(`Downloaded content is not GPX format`);
      return null;
    }
    
    console.log(`Successfully downloaded GPX (${text.length} bytes)`);
    return new TextEncoder().encode(text).buffer;
  } catch (error) {
    console.error(`Error downloading GPX:`, error);
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

    const { data: routesWithoutGpx, error: fetchError } = await supabase
      .from('favorite_routes')
      .select('id, title, route_link')
      .is('gpx_file_url', null)
      .ilike('route_link', '%bicycle.holiday%');

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
      
      const pageId = extractPageId(route.route_link);
      if (!pageId) {
        results.push({ id: route.id, title: route.title, status: 'no_gpx_found', error: 'No page_id found' });
        failed++;
        continue;
      }

      const rwgpsId = PAGE_TO_RWGPS[pageId];
      if (!rwgpsId) {
        results.push({ id: route.id, title: route.title, status: 'no_gpx_found', error: `No RWGPS mapping for page_id ${pageId}` });
        failed++;
        continue;
      }

      console.log(`Page ID ${pageId} → RWGPS ID ${rwgpsId}`);

      const gpxData = await downloadGpx(rwgpsId);
      if (!gpxData) {
        results.push({ id: route.id, title: route.title, status: 'no_gpx_found', rwgps_id: rwgpsId, error: 'GPX download failed' });
        failed++;
        continue;
      }

      const routeNumber = extractRouteNumber(route.title);
      const gpxPath = `gpx/${Date.now()}-route-${routeNumber}.gpx`;

      const { error: uploadError } = await supabase.storage
        .from('routes')
        .upload(gpxPath, gpxData, { contentType: 'application/gpx+xml', upsert: false });

      if (uploadError) {
        results.push({ id: route.id, title: route.title, status: 'failed', rwgps_id: rwgpsId, error: uploadError.message });
        failed++;
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from('routes').getPublicUrl(gpxPath);

      const { error: updateError } = await supabase
        .from('favorite_routes')
        .update({ gpx_file_url: publicUrl })
        .eq('id', route.id);

      if (updateError) {
        results.push({ id: route.id, title: route.title, status: 'failed', rwgps_id: rwgpsId, error: updateError.message });
        failed++;
        continue;
      }

      console.log(`Successfully updated route ${routeNumber}`);
      results.push({ id: route.id, title: route.title, status: 'updated', gpx_url: publicUrl, rwgps_id: rwgpsId });
      updated++;
    }

    console.log(`\n=== Complete: ${updated} updated, ${failed} failed ===`);

    return new Response(
      JSON.stringify({ success: true, total: routesWithoutGpx.length, updated, failed, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
