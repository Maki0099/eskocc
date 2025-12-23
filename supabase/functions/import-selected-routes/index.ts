import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedImage {
  base64: string;
  caption: string;
}

interface ManualImage {
  base64: string;
  caption: string;
}

interface SelectedRoute {
  title: string;
  description?: string;
  distance_km?: number;
  elevation_m?: number;
  min_elevation?: number;
  max_elevation?: number;
  difficulty?: string;
  terrain_type?: string;
  gpx_url?: string;
  gpx_base64?: string;
  gpx_filename?: string;
  cover_url?: string;
  route_link?: string;
  generated_images?: GeneratedImage[];
  manual_images?: ManualImage[];
}

interface ImportResult {
  title: string;
  status: 'imported' | 'skipped' | 'error';
  error?: string;
  routeId?: string;
  imagesUploaded?: number;
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

// Upload AI-generated images to storage and create gallery_items records
async function uploadGeneratedImages(
  supabase: any,
  routeId: string,
  images: GeneratedImage[],
  userId: string
): Promise<number> {
  let uploadedCount = 0;
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    try {
      // Convert base64 to ArrayBuffer
      const imageBuffer = base64ToArrayBuffer(image.base64);
      
      // Determine file extension from base64 header
      let extension = 'png';
      let contentType = 'image/png';
      if (image.base64.startsWith('data:image/jpeg') || image.base64.startsWith('data:image/jpg')) {
        extension = 'jpg';
        contentType = 'image/jpeg';
      } else if (image.base64.startsWith('data:image/webp')) {
        extension = 'webp';
        contentType = 'image/webp';
      }
      
      const fileName = `ai-generated-${Date.now()}-${i}.${extension}`;
      const filePath = `route-${routeId}/${fileName}`;
      
      console.log(`Uploading AI image ${i + 1}/${images.length} for route ${routeId}`);
      
      // Upload to gallery bucket
      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, imageBuffer, {
          contentType,
          upsert: false
        });
      
      if (uploadError) {
        console.error(`Failed to upload AI image ${i + 1}:`, uploadError);
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);
      
      // Create gallery_items record
      const { error: insertError } = await supabase
        .from('gallery_items')
        .insert({
          route_id: routeId,
          user_id: userId,
          file_url: urlData.publicUrl,
          file_name: fileName,
          caption: image.caption
        });
      
      if (insertError) {
        console.error(`Failed to create gallery_item for AI image ${i + 1}:`, insertError);
        // Try to clean up uploaded file
        await supabase.storage.from('gallery').remove([filePath]);
        continue;
      }
      
      uploadedCount++;
      console.log(`Successfully uploaded AI image ${i + 1}`);
      
    } catch (error) {
      console.error(`Error processing AI image ${i + 1}:`, error);
    }
  }
  
  return uploadedCount;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { routes, userId } = await req.json() as { routes: SelectedRoute[]; userId?: string };

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No routes provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required for importing routes with images' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Importing ${routes.length} routes for user ${userId}`);

    const results: ImportResult[] = [];
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    let totalImagesUploaded = 0;

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

        // Handle cover image - prefer first AI generated image, then try URL download
        if (!coverImageUrl && route.generated_images && route.generated_images.length > 0) {
          console.log(`Using first AI-generated image as cover for ${route.title}`);
          try {
            const firstImage = route.generated_images[0];
            const imageBuffer = base64ToArrayBuffer(firstImage.base64);
            
            let extension = 'png';
            let contentType = 'image/png';
            if (firstImage.base64.startsWith('data:image/jpeg') || firstImage.base64.startsWith('data:image/jpg')) {
              extension = 'jpg';
              contentType = 'image/jpeg';
            } else if (firstImage.base64.startsWith('data:image/webp')) {
              extension = 'webp';
              contentType = 'image/webp';
            }
            
            const coverFilename = `${route.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cover.${extension}`;
            const coverPath = `covers/${Date.now()}-${coverFilename}`;

            const { error: uploadError } = await supabase.storage
              .from('routes')
              .upload(coverPath, imageBuffer, {
                contentType,
                upsert: false
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage.from('routes').getPublicUrl(coverPath);
              coverImageUrl = publicUrl;
              console.log(`AI cover uploaded: ${coverImageUrl}`);
            } else {
              console.error(`AI cover upload error for ${route.title}:`, uploadError);
            }
          } catch (err) {
            console.error(`Error uploading AI cover for ${route.title}:`, err);
          }
        }
        
        // Fallback: try to download cover from URL (if provided and not a staticmap URL)
        if (!coverImageUrl && route.cover_url && !route.cover_url.includes('staticmap')) {
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
        const { data: insertedRoute, error: insertError } = await supabase
          .from('favorite_routes')
          .insert({
            title: route.title,
            description: route.description || null,
            distance_km: route.distance_km ? Math.round(route.distance_km) : null,
            elevation_m: route.elevation_m ? Math.round(route.elevation_m) : null,
            min_elevation: route.min_elevation ? Math.round(route.min_elevation) : null,
            max_elevation: route.max_elevation ? Math.round(route.max_elevation) : null,
            difficulty,
            terrain_type: route.terrain_type || 'road',
            gpx_file_url: gpxFileUrl,
            cover_image_url: coverImageUrl,
            route_link: route.route_link || null
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Insert error for ${route.title}:`, insertError);
          results.push({ title: route.title, status: 'error', error: insertError.message });
          errors++;
        } else {
          console.log(`Successfully imported: ${route.title} with id: ${insertedRoute.id}`);
          
          let imagesUploaded = 0;
          
          // Upload AI-generated images if present
          if (route.generated_images && route.generated_images.length > 0) {
            console.log(`Uploading ${route.generated_images.length} AI-generated images for route ${insertedRoute.id}`);
            const aiImagesUploaded = await uploadGeneratedImages(supabase, insertedRoute.id, route.generated_images, userId);
            imagesUploaded += aiImagesUploaded;
            totalImagesUploaded += aiImagesUploaded;
            console.log(`Uploaded ${aiImagesUploaded} AI images for route ${route.title}`);
          }
          
          // Upload manual images if present
          if (route.manual_images && route.manual_images.length > 0) {
            console.log(`Uploading ${route.manual_images.length} manual images for route ${insertedRoute.id}`);
            const manualImagesUploaded = await uploadGeneratedImages(supabase, insertedRoute.id, route.manual_images, userId);
            imagesUploaded += manualImagesUploaded;
            totalImagesUploaded += manualImagesUploaded;
            console.log(`Uploaded ${manualImagesUploaded} manual images for route ${route.title}`);
          }
          
          results.push({ 
            title: route.title, 
            status: 'imported', 
            routeId: insertedRoute.id,
            imagesUploaded 
          });
          imported++;
        }

      } catch (error: unknown) {
        console.error(`Error processing route ${route.title}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ title: route.title, status: 'error', error: errorMessage });
        errors++;
      }
    }

    console.log(`Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors, ${totalImagesUploaded} images uploaded`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        skipped, 
        errors,
        totalImagesUploaded,
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
