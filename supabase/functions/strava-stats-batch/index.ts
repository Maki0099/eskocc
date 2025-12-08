import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface StravaProfile {
  id: string;
  strava_id: string;
  strava_access_token: string;
  strava_refresh_token: string;
  strava_token_expires_at: string;
  strava_ytd_distance: number | null;
  strava_stats_cached_at: string | null;
}

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

async function fetchStravaStats(
  profile: StravaProfile,
  supabaseUrl: string,
  supabaseServiceKey: string,
  clientId: string,
  clientSecret: string
): Promise<{ userId: string; ytd_distance: number; ytd_count: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Check cache first
  if (profile.strava_stats_cached_at) {
    const cachedAt = new Date(profile.strava_stats_cached_at).getTime();
    const now = Date.now();
    if (now - cachedAt < CACHE_DURATION_MS && profile.strava_ytd_distance !== null) {
      console.log(`Using cached stats for user ${profile.id}`);
      return {
        userId: profile.id,
        ytd_distance: profile.strava_ytd_distance || 0,
        ytd_count: 0,
      };
    }
  }

  let accessToken = profile.strava_access_token;

  // Check if token is expired
  const expiresAt = new Date(profile.strava_token_expires_at);
  if (expiresAt < new Date()) {
    console.log(`Token expired for user ${profile.id}, refreshing...`);
    const newTokens = await refreshStravaToken(
      profile.strava_refresh_token,
      clientId,
      clientSecret
    );

    if (!newTokens) {
      console.error(`Failed to refresh token for user ${profile.id}`);
      return { userId: profile.id, ytd_distance: 0, ytd_count: 0 };
    }

    // Update tokens in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        strava_access_token: newTokens.access_token,
        strava_refresh_token: newTokens.refresh_token,
        strava_token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
      })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error(`Failed to update tokens for ${profile.id}:`, updateError);
    }

    accessToken = newTokens.access_token;
  }

  // Fetch athlete stats from Strava
  console.log(`Fetching Strava stats for user ${profile.id}, athlete ${profile.strava_id}`);
  const statsResponse = await fetch(
    `https://www.strava.com/api/v3/athletes/${profile.strava_id}/stats`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!statsResponse.ok) {
    const errorText = await statsResponse.text();
    console.error(`Strava API error for user ${profile.id}:`, errorText);
    return { userId: profile.id, ytd_distance: 0, ytd_count: 0 };
  }

  const stats = await statsResponse.json();
  const ytd_distance = Math.round((stats.ytd_ride_totals?.distance || 0) / 1000);
  const ytd_count = stats.ytd_ride_totals?.count || 0;

  // Update cache in database
  const { error: cacheError } = await supabase
    .from('profiles')
    .update({
      strava_ytd_distance: ytd_distance,
      strava_ytd_count: ytd_count,
      strava_stats_cached_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  if (cacheError) {
    console.error(`Failed to cache stats for ${profile.id}:`, cacheError);
  }

  console.log(`Fetched and cached stats for user ${profile.id}: ${ytd_distance} km`);

  return { userId: profile.id, ytd_distance, ytd_count };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds } = await req.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing batch stats for ${userIds.length} users`);

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

    // Fetch all profiles at once
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, strava_id, strava_access_token, strava_refresh_token, strava_token_expires_at, strava_ytd_distance, strava_ytd_count, strava_stats_cached_at')
      .in('id', userIds);

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only profiles with Strava connected
    const stravaProfiles = (profiles || []).filter(
      p => p.strava_id && p.strava_access_token && p.strava_refresh_token
    );

    console.log(`Found ${stravaProfiles.length} users with Strava connected`);

    // Process all users in parallel
    const statsPromises = stravaProfiles.map(profile => 
      fetchStravaStats(profile as StravaProfile, supabaseUrl, supabaseServiceKey, clientId, clientSecret)
    );

    const statsResults = await Promise.all(statsPromises);

    // Create a map of userId -> stats
    const statsMap: Record<string, { ytd_distance: number; ytd_count: number }> = {};
    
    for (const result of statsResults) {
      statsMap[result.userId] = {
        ytd_distance: result.ytd_distance,
        ytd_count: result.ytd_count,
      };
    }

    // Add zero stats for users without Strava
    for (const userId of userIds) {
      if (!statsMap[userId]) {
        statsMap[userId] = { ytd_distance: 0, ytd_count: 0 };
      }
    }

    console.log(`Returning stats for ${Object.keys(statsMap).length} users`);

    return new Response(
      JSON.stringify({ stats: statsMap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in strava-stats-batch:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
