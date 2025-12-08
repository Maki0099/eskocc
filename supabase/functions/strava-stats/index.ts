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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get user's Strava tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('strava_id, strava_access_token, strava_refresh_token, strava_token_expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Failed to get profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.strava_access_token || !profile.strava_refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Strava not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = profile.strava_access_token;

    // Check if token is expired
    const expiresAt = new Date(profile.strava_token_expires_at);
    if (expiresAt < new Date()) {
      console.log('Token expired, refreshing...');
      const newTokens = await refreshStravaToken(
        profile.strava_refresh_token,
        clientId,
        clientSecret
      );

      if (!newTokens) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update tokens in database
      await supabase
        .from('profiles')
        .update({
          strava_access_token: newTokens.access_token,
          strava_refresh_token: newTokens.refresh_token,
          strava_token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
        })
        .eq('id', userId);

      accessToken = newTokens.access_token;
    }

    // Fetch athlete stats from Strava
    console.log('Fetching Strava stats for athlete:', profile.strava_id);
    const statsResponse = await fetch(
      `https://www.strava.com/api/v3/athletes/${profile.strava_id}/stats`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error('Strava API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Strava stats' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = await statsResponse.json();
    console.log('Successfully fetched Strava stats');

    // Extract relevant cycling stats
    const result = {
      all_ride_totals: {
        count: stats.all_ride_totals?.count || 0,
        distance: stats.all_ride_totals?.distance || 0, // in meters
        moving_time: stats.all_ride_totals?.moving_time || 0, // in seconds
        elapsed_time: stats.all_ride_totals?.elapsed_time || 0,
        elevation_gain: stats.all_ride_totals?.elevation_gain || 0, // in meters
      },
      ytd_ride_totals: {
        count: stats.ytd_ride_totals?.count || 0,
        distance: stats.ytd_ride_totals?.distance || 0,
        moving_time: stats.ytd_ride_totals?.moving_time || 0,
        elevation_gain: stats.ytd_ride_totals?.elevation_gain || 0,
      },
      recent_ride_totals: {
        count: stats.recent_ride_totals?.count || 0,
        distance: stats.recent_ride_totals?.distance || 0,
        moving_time: stats.recent_ride_totals?.moving_time || 0,
        elevation_gain: stats.recent_ride_totals?.elevation_gain || 0,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in strava-stats:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
