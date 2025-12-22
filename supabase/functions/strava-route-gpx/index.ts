import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshStravaToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number } | null> {
  console.log('Refreshing Strava token...');
  
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Token refresh network error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { route_id, user_id } = await req.json();

    if (!route_id) {
      return new Response(
        JSON.stringify({ error: 'route_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching GPX for Strava route ${route_id}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('STRAVA_CLIENT_ID');
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First try to use the requesting user's token if they have one
    let accessToken: string | null = null;

    if (user_id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('strava_access_token, strava_refresh_token, strava_token_expires_at')
        .eq('id', user_id)
        .single();

      if (userProfile?.strava_access_token) {
        let token = userProfile.strava_access_token;
        
        // Check if token is expired
        const expiresAt = new Date(userProfile.strava_token_expires_at);
        if (expiresAt < new Date() && userProfile.strava_refresh_token) {
          const newTokens = await refreshStravaToken(
            userProfile.strava_refresh_token,
            clientId,
            clientSecret
          );

          if (newTokens) {
            await supabase
              .from('profiles')
              .update({
                strava_access_token: newTokens.access_token,
                strava_refresh_token: newTokens.refresh_token,
                strava_token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
              })
              .eq('id', user_id);

            token = newTokens.access_token;
          }
        }

        accessToken = token;
        console.log('Using requesting user\'s Strava token');
      }
    }

    // Fall back to any club member's token
    if (!accessToken) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at')
        .eq('is_strava_club_member', true)
        .not('strava_access_token', 'is', null)
        .not('strava_refresh_token', 'is', null)
        .limit(10);

      if (profiles && profiles.length > 0) {
        for (const profile of profiles) {
          let token = profile.strava_access_token;
          
          const expiresAt = new Date(profile.strava_token_expires_at);
          if (expiresAt < new Date()) {
            const newTokens = await refreshStravaToken(
              profile.strava_refresh_token,
              clientId,
              clientSecret
            );

            if (newTokens) {
              await supabase
                .from('profiles')
                .update({
                  strava_access_token: newTokens.access_token,
                  strava_refresh_token: newTokens.refresh_token,
                  strava_token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
                })
                .eq('id', profile.id);

              token = newTokens.access_token;
            } else {
              continue;
            }
          }

          // Test if token works for route export
          const testResponse = await fetch(
            `https://www.strava.com/api/v3/routes/${route_id}/export_gpx`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (testResponse.ok || testResponse.status === 200) {
            accessToken = token;
            console.log(`Using token from profile ${profile.id}`);
            break;
          } else {
            console.log(`Token from profile ${profile.id} failed for GPX export:`, testResponse.status);
          }
        }
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No valid Strava token available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch GPX from Strava
    const gpxResponse = await fetch(
      `https://www.strava.com/api/v3/routes/${route_id}/export_gpx`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!gpxResponse.ok) {
      const errorText = await gpxResponse.text();
      console.error('Failed to fetch GPX:', gpxResponse.status, errorText);
      
      // Check if it's a permission issue
      if (gpxResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Route not found or not accessible' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch GPX from Strava' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gpxContent = await gpxResponse.text();
    console.log(`Successfully fetched GPX for route ${route_id}, size: ${gpxContent.length} bytes`);

    // Upload GPX to Supabase Storage
    const fileName = `strava_route_${route_id}_${Date.now()}.gpx`;
    const filePath = `routes/gpx/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('events')
      .upload(filePath, gpxContent, {
        contentType: 'application/gpx+xml',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload GPX to storage:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save GPX file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('events')
      .getPublicUrl(filePath);

    console.log(`GPX uploaded successfully: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        gpx_url: urlData.publicUrl,
        file_name: fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in strava-route-gpx function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
