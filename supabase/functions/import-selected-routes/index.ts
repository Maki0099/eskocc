import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectedRoute {
  title: string;
  description?: string;
  distance_km?: number;
  elevation_m?: number;
  difficulty?: string;
  terrain_type?: string;
  gpx_url?: string;
  gpx_base64?: string;
  gpx_filename?: string;
  cover_url?: string;
  route_link?: string;
}

interface ImportResult {
  title: string;
  status: 'imported' | 'skipped' | 'error';
  error?: string;
}

function calculateDifficulty(elevation_m: number | undefined): string {
  if (!elevation_m) return 'easy';
  if (elevation_m < 1000) return 'easy';
  if (elevation_m < 2000) return 'medium';
  return 'hard';
}

async function downloadFile(url: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to download ${url}: ${response.status}`);
      return null;
    }
    
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    return { data, contentType };
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return null;
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { routes } = await req.json() as { routes: SelectedRoute[] };

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No routes provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importing ${routes.length} routes`);

    const results: ImportResult[] = [];
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const route of routes) {
      try {
        console.log(`Processing route: ${route.title}`);

        // Check if route already exists by title
        const { data: existing } = await supabase
          .from('favorite_routes')
          .select('id')
          .eq('title', route.title)
          .maybeSingle();

        if (existing) {
          console.log(`Route "${route.title}" already exists, skipping`);
          results.push({ title: route.title, status: 'skipped', error: 'Already exists' });
          skipped++;
          continue;
        }

        let gpxFileUrl: string | null = null;
        let coverImageUrl: string | null = null;

        // Handle GPX file
        if (route.gpx_base64) {
          // Manual upload - decode base64
          console.log(`Uploading manual GPX for ${route.title}`);
          const gpxData = base64ToArrayBuffer(route.gpx_base64);
          const gpxFilename = route.gpx_filename || `${route.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gpx`;
          const gpxPath = `gpx/${Date.now()}-${gpxFilename}`;

          const { error: uploadError } = await supabase.storage
            .from('routes')
            .upload(gpxPath, gpxData, {
              contentType: 'application/gpx+xml',
              upsert: false
            });

          if (uploadError) {
            console.error(`GPX upload error for ${route.title}:`, uploadError);
          } else {
            const { data: { publicUrl } } = supabase.storage.from('routes').getPublicUrl(gpxPath);
            gpxFileUrl = publicUrl;
            console.log(`GPX uploaded: ${gpxFileUrl}`);
          }
        } else if (route.gpx_url) {
          // Auto download GPX
          console.log(`Downloading GPX from ${route.gpx_url}`);
          const gpxFile = await downloadFile(route.gpx_url);
          
          if (gpxFile) {
            const gpxFilename = `${route.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.gpx`;
            const gpxPath = `gpx/${Date.now()}-${gpxFilename}`;

            const { error: uploadError } = await supabase.storage
              .from('routes')
              .upload(gpxPath, gpxFile.data, {
                contentType: 'application/gpx+xml',
                upsert: false
              });

            if (uploadError) {
              console.error(`GPX upload error for ${route.title}:`, uploadError);
            } else {
              const { data: { publicUrl } } = supabase.storage.from('routes').getPublicUrl(gpxPath);
              gpxFileUrl = publicUrl;
              console.log(`GPX uploaded: ${gpxFileUrl}`);
            }
          }
        }

        // Handle cover image
        if (route.cover_url) {
          console.log(`Downloading cover image from ${route.cover_url}`);
          const coverFile = await downloadFile(route.cover_url);
          
          if (coverFile) {
            const extension = route.cover_url.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
            const coverFilename = `${route.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${extension}`;
            const coverPath = `covers/${Date.now()}-${coverFilename}`;

            const { error: uploadError } = await supabase.storage
              .from('routes')
              .upload(coverPath, coverFile.data, {
                contentType: coverFile.contentType,
                upsert: false
              });

            if (uploadError) {
              console.error(`Cover upload error for ${route.title}:`, uploadError);
            } else {
              const { data: { publicUrl } } = supabase.storage.from('routes').getPublicUrl(coverPath);
              coverImageUrl = publicUrl;
              console.log(`Cover uploaded: ${coverImageUrl}`);
            }
          }
        }

        // Calculate difficulty if not provided
        const difficulty = route.difficulty || calculateDifficulty(route.elevation_m);

        // Insert route into database
        const { error: insertError } = await supabase
          .from('favorite_routes')
          .insert({
            title: route.title,
            description: route.description || null,
            distance_km: route.distance_km || null,
            elevation_m: route.elevation_m || null,
            difficulty,
            terrain_type: route.terrain_type || 'road',
            gpx_file_url: gpxFileUrl,
            cover_image_url: coverImageUrl,
            route_link: route.route_link || null
          });

        if (insertError) {
          console.error(`Insert error for ${route.title}:`, insertError);
          results.push({ title: route.title, status: 'error', error: insertError.message });
          errors++;
        } else {
          console.log(`Successfully imported: ${route.title}`);
          results.push({ title: route.title, status: 'imported' });
          imported++;
        }

      } catch (error: unknown) {
        console.error(`Error processing route ${route.title}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ title: route.title, status: 'error', error: errorMessage });
        errors++;
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        skipped, 
        errors,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in import-selected-routes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
