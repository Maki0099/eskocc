import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ESKO.cc Strava Club ID
const STRAVA_CLUB_ID = 1860524;

// ============= Web Push Helper Functions =============

function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64url(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidJwt(audience: string, subject: string, privateKeyBytes: Uint8Array): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  return `${unsignedToken}.${uint8ArrayToBase64url(new Uint8Array(signature))}`;
}

async function encryptPayload(payload: string, p256dhB64: string, authB64: string): Promise<{ body: ArrayBuffer; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  const subscriberPublicKeyBytes = base64urlToUint8Array(p256dhB64);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authSecret = base64urlToUint8Array(authB64);
  const ikm = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']);
  
  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret.buffer as ArrayBuffer, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    ikm,
    256
  );

  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HKDF' }, false, ['deriveBits']);
  const context = new Uint8Array([
    ...new TextEncoder().encode('P-256\0'),
    0, 65, ...subscriberPublicKeyBytes,
    0, 65, ...localPublicKey,
  ]);

  const cekInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), ...context]);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...context]);

  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, info: cekInfo }, prkKey, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, info: nonceInfo }, prkKey, 96);

  const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const paddedPayload = new Uint8Array([0, 0, ...new TextEncoder().encode(payload)]);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, paddedPayload);

  return { body: encrypted, salt, localPublicKey };
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

interface VapidKeys {
  public_key: string;
  private_key: string;
}

async function sendPushNotification(subscription: PushSubscription, payload: string, vapidKeys: VapidKeys): Promise<void> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const privateKeyPem = vapidKeys.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const privateKeyBytes = base64urlToUint8Array(pemContents.replace(/\+/g, '-').replace(/\//g, '_'));

  const jwt = await createVapidJwt(audience, 'mailto:info@eskocc.cz', privateKeyBytes);
  const { body, salt, localPublicKey } = await encryptPayload(payload, subscription.p256dh, subscription.auth);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${vapidKeys.public_key}`,
      'Crypto-Key': `dh=${uint8ArrayToBase64url(localPublicKey)}; p256ecdsa=${vapidKeys.public_key}`,
      'Encryption': `salt=${uint8ArrayToBase64url(salt)}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Push failed: ${response.status} - ${errorText}`);
  }
}

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
  // Additional fields from Strava API
  start_latlng?: [number, number] | null;
  skill_levels?: number;
  terrain?: number;
  route?: {
    id: number;
    map?: {
      summary_polyline?: string;
    };
  } | null;
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

    // Get existing strava event IDs to detect new ones
    const { data: existingEvents } = await supabase
      .from('strava_club_events')
      .select('strava_event_id');
    
    const existingEventIds = new Set((existingEvents || []).map(e => e.strava_event_id));

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

    const stravaEventsRaw = await eventsResponse.json();
    console.log(`Fetched ${stravaEventsRaw.length} group events from Strava`);
    
    // Log raw event data for debugging
    if (stravaEventsRaw.length > 0) {
      console.log('Raw event data sample:', JSON.stringify(stravaEventsRaw[0], null, 2));
    }

    // Strava API may return upcoming_occurrences instead of start_date for recurring events
    // Map the raw data to our expected format, extracting the first upcoming occurrence
    const stravaEvents: StravaGroupEvent[] = stravaEventsRaw.map((event: any) => {
      // Try to get date from various possible fields
      let eventDate = event.start_date_local || event.start_date;
      
      // Check for upcoming_occurrences (recurring events)
      if (!eventDate && event.upcoming_occurrences && event.upcoming_occurrences.length > 0) {
        eventDate = event.upcoming_occurrences[0];
        console.log(`Event "${event.title}" using upcoming_occurrence: ${eventDate}`);
      }
      
      return {
        ...event,
        start_date_local: eventDate,
        start_date: eventDate,
      };
    });

    // Detect new events
    const newEvents = stravaEvents.filter(event => !existingEventIds.has(String(event.id)));
    console.log(`Detected ${newEvents.length} new events`);

    // Filter out events without valid dates and prepare for upsert
    const eventsToUpsert = stravaEvents
      .filter(event => {
        const hasDate = event.start_date_local || event.start_date;
        if (!hasDate) {
          console.log(`Skipping event "${event.title}" (ID: ${event.id}) - no valid date`);
        }
        return hasDate;
      })
      .map(event => ({
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
        // Additional fields from Strava API
        start_latlng: event.start_latlng || null,
        skill_level: event.skill_levels || null,
        terrain: event.terrain || null,
        strava_route_id: event.route?.id ? String(event.route.id) : (event.route_id ? String(event.route_id) : null),
        route_polyline: event.route?.map?.summary_polyline || null,
      }));

    // Also filter newEvents for the same reason
    const validNewEvents = newEvents.filter(event => event.start_date_local || event.start_date);
    
    console.log(`${stravaEventsRaw.length} events from API, ${eventsToUpsert.length} have valid dates`);

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

    // Send push notifications for new events (use validNewEvents)
    if (validNewEvents.length > 0) {
      console.log(`Sending push notifications for ${validNewEvents.length} new events...`);

      // Get VAPID keys
      const { data: vapidKeys } = await supabase
        .from('vapid_keys')
        .select('*')
        .limit(1)
        .single();

      if (vapidKeys) {
        // Get all push subscriptions for members with push notifications enabled
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth, user_id');

        if (subscriptions && subscriptions.length > 0) {
          for (const newEvent of validNewEvents) {
            const eventDate = new Date(newEvent.start_date_local || newEvent.start_date);
            const dateStr = eventDate.toLocaleDateString('cs-CZ', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            });

            const payload = JSON.stringify({
              title: '🚴 Nová vyjížďka na Stravě!',
              body: `${newEvent.title} - ${dateStr}`,
              icon: '/pwa-192x192.png',
              badge: '/pwa-64x64.png',
              data: {
                url: '/events',
                type: 'strava_event',
                strava_event_id: String(newEvent.id)
              }
            });

            // Send to all subscriptions
            let sentCount = 0;
            for (const sub of subscriptions) {
              try {
                await sendPushNotification(sub as PushSubscription, payload, vapidKeys);
                sentCount++;
              } catch (error) {
                console.error(`Failed to send notification to subscription:`, error);
              }
            }
            console.log(`Sent ${sentCount} notifications for event "${newEvent.title}"`);
          }

          // Also create in-app notifications for all members
          const { data: memberRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('role', ['member', 'active_member', 'admin']);

          if (memberRoles && memberRoles.length > 0) {
            for (const newEvent of validNewEvents) {
              const eventDate = new Date(newEvent.start_date_local || newEvent.start_date);
              const dateStr = eventDate.toLocaleDateString('cs-CZ', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long'
              });

              const notifications = memberRoles.map(member => ({
                user_id: member.user_id,
                title: '🚴 Nová vyjížďka na Stravě',
                message: `${newEvent.title} - ${dateStr}`,
                type: 'event',
                url: '/events',
                is_read: false
              }));

              const { error: notifError } = await supabase
                .from('notifications')
                .insert(notifications);

              if (notifError) {
                console.error('Failed to create in-app notifications:', notifError);
              } else {
                console.log(`Created ${notifications.length} in-app notifications for event "${newEvent.title}"`);
              }
            }
          }
        }
      } else {
        console.log('No VAPID keys found, skipping push notifications');
      }
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
        new_events_count: validNewEvents.length,
        skipped_no_date: stravaEvents.length - eventsToUpsert.length,
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
