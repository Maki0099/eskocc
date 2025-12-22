import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ESKO.cc Strava Club ID
const STRAVA_CLUB_ID = 1860524;

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

interface StravaGroupEvent {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  start_date_local: string;
  address: string | null;
  route_id: number | null;
  sport_type: string;
  organizing_athlete: {
    id: number;
    firstname: string;
    lastname: string;
  } | null;
  athlete_count: number;
  women_only: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Find an admin or active member with valid Strava tokens to use for API calls
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at, is_strava_club_member')
      .eq('is_strava_club_member', true)
      .not('strava_access_token', 'is', null)
      .not('strava_refresh_token', 'is', null)
      .limit(10);

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('No profiles with Strava connection found:', profilesError);
      return new Response(
        JSON.stringify({ error: 'No Strava-connected members found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try each profile until one works
    let accessToken: string | null = null;
    let workingProfileId: string | null = null;

    for (const profile of profiles) {
      let token = profile.strava_access_token;
      
      // Check if token is expired
      const expiresAt = new Date(profile.strava_token_expires_at);
      if (expiresAt < new Date()) {
        console.log(`Token expired for profile ${profile.id}, refreshing...`);
        const newTokens = await refreshStravaToken(
          profile.strava_refresh_token,
          clientId,
          clientSecret
        );

        if (newTokens) {
          // Update tokens in database
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
          console.log(`Failed to refresh token for profile ${profile.id}, trying next...`);
          continue;
        }
      }

      // Test the token by fetching club events
      const testResponse = await fetch(
        `https://www.strava.com/api/v3/clubs/${STRAVA_CLUB_ID}/group_events`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (testResponse.ok) {
        accessToken = token;
        workingProfileId = profile.id;
        console.log(`Using token from profile ${profile.id}`);
        break;
      } else {
        console.log(`Token from profile ${profile.id} failed:`, await testResponse.text());
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No valid Strava token available' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch club group events from Strava
    console.log(`Fetching group events for club ${STRAVA_CLUB_ID}...`);
    const eventsResponse = await fetch(
      `https://www.strava.com/api/v3/clubs/${STRAVA_CLUB_ID}/group_events`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error('Failed to fetch club events:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch club events from Strava' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stravaEvents: StravaGroupEvent[] = await eventsResponse.json();
    console.log(`Fetched ${stravaEvents.length} group events from Strava`);

    // Upsert events into database
    const eventsToUpsert = stravaEvents.map(event => ({
      strava_event_id: String(event.id),
      title: event.title,
      description: event.description,
      event_date: event.start_date_local || event.start_date,
      address: event.address,
      route_id: event.route_id ? String(event.route_id) : null,
      sport_type: event.sport_type,
      organizing_athlete_id: event.organizing_athlete?.id ? String(event.organizing_athlete.id) : null,
      organizing_athlete_name: event.organizing_athlete 
        ? `${event.organizing_athlete.firstname} ${event.organizing_athlete.lastname.charAt(0)}.`
        : null,
      participant_count: event.athlete_count || 0,
      women_only: event.women_only || false,
      updated_at: new Date().toISOString(),
    }));

    if (eventsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('strava_club_events')
        .upsert(eventsToUpsert, { 
          onConflict: 'strava_event_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Failed to upsert events:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save events to database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully upserted ${eventsToUpsert.length} events`);
    }

    // Clean up old events (past events older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { error: deleteError } = await supabase
      .from('strava_club_events')
      .delete()
      .lt('event_date', sevenDaysAgo.toISOString());

    if (deleteError) {
      console.warn('Failed to clean up old events:', deleteError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_count: eventsToUpsert.length,
        events: eventsToUpsert.map(e => ({ title: e.title, date: e.event_date }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in strava-club-events function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
