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

async function checkClubMembership(accessToken: string): Promise<boolean> {
  console.log('Checking Strava club membership...');
  
  try {
    const response = await fetch('https://www.strava.com/api/v3/athlete/clubs', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error('Failed to fetch clubs:', await response.text());
      return false;
    }

    const clubs = await response.json();
    const isMember = clubs.some((club: { id: number }) => club.id === STRAVA_CLUB_ID);
    console.log(`Club membership check: ${isMember ? 'member' : 'not a member'}`);
    return isMember;
  } catch (error) {
    console.error('Error checking club membership:', error);
    return false;
  }
}

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION_MS = 60 * 60 * 1000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, forceRefresh } = await req.json();
    
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

    // Get user's Strava tokens, cached stats, and current club membership status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('strava_id, strava_access_token, strava_refresh_token, strava_token_expires_at, is_strava_club_member, full_name, nickname, strava_stats_cached_at, strava_monthly_stats, strava_ytd_distance, strava_ytd_count')
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

    // Check if we have valid cached data (less than 1 hour old)
    if (!forceRefresh && profile.strava_stats_cached_at && profile.strava_monthly_stats) {
      const cacheAge = Date.now() - new Date(profile.strava_stats_cached_at).getTime();
      
      if (cacheAge < CACHE_DURATION_MS) {
        console.log(`Returning cached stats (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
        
        // Return cached data
        return new Response(
          JSON.stringify({
            cached: true,
            all_ride_totals: profile.strava_monthly_stats.all_ride_totals || { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 },
            ytd_ride_totals: profile.strava_monthly_stats.ytd_ride_totals || { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 },
            recent_ride_totals: profile.strava_monthly_stats.recent_ride_totals || { count: 0, distance: 0, moving_time: 0, elevation_gain: 0 },
            monthly_stats: profile.strava_monthly_stats.monthly_stats || [],
            is_club_member: profile.is_strava_club_member || false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Cache expired or not available, fetching fresh data from Strava API...');
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

    // Check club membership and update profile
    const wasClubMember = profile.is_strava_club_member || false;
    const isClubMember = await checkClubMembership(accessToken);
    
    await supabase
      .from('profiles')
      .update({ is_strava_club_member: isClubMember })
      .eq('id', userId);

    // Send push notification if user just became a club member
    if (!wasClubMember && isClubMember) {
      console.log('User just became a club member, sending congratulation notification...');
      
      // Get user's push subscription
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (subscriptions && subscriptions.length > 0) {
        // Get VAPID keys
        const { data: vapidKeys } = await supabase
          .from('vapid_keys')
          .select('*')
          .limit(1)
          .single();

        if (vapidKeys) {
          const userName = profile.nickname || profile.full_name?.split(' ')[0] || 'člene';
          
          // Import push sending logic
          const payload = JSON.stringify({
            title: '🎉 Vítej v klubu!',
            body: `Gratulujeme ${userName}! Jsi nyní členem ESKO.cc na Stravě.`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-64x64.png',
            data: {
              url: '/dashboard',
              type: 'club_membership'
            }
          });

          // Send notification to each subscription
          for (const sub of subscriptions) {
            try {
              await sendPushNotification(sub, payload, vapidKeys);
              console.log('Congratulation notification sent successfully');
            } catch (error) {
              console.error('Failed to send congratulation notification:', error);
            }
          }
        }
      }
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

    // Fetch activities for the last 12 months
    const oneYearAgo = Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60);
    console.log('Fetching activities since:', new Date(oneYearAgo * 1000).toISOString());
    
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${oneYearAgo}&per_page=200`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let monthlyStats: { month: string; distance: number; count: number }[] = [];
    
    if (activitiesResponse.ok) {
      const activities = await activitiesResponse.json();
      console.log(`Fetched ${activities.length} activities for the last year`);
      
      // Group activities by month
      const monthlyData: Record<string, { distance: number; count: number }> = {};
      
      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = { distance: 0, count: 0 };
      }
      
      // Aggregate cycling activities by month
      for (const activity of activities) {
        if (activity.type === 'Ride' || activity.type === 'VirtualRide' || activity.type === 'GravelRide' || activity.type === 'MountainBikeRide') {
          const date = new Date(activity.start_date);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyData[key]) {
            monthlyData[key].distance += activity.distance || 0;
            monthlyData[key].count += 1;
          }
        }
      }
      
      // Convert to array sorted by date
      monthlyStats = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          distance: Math.round(data.distance / 1000), // Convert to km
          count: data.count,
        }));
    } else {
      console.error('Failed to fetch activities:', await activitiesResponse.text());
    }

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
      monthly_stats: monthlyStats,
      is_club_member: isClubMember,
    };

    // Cache the stats in the database
    const ytdDistanceKm = Math.round((stats.ytd_ride_totals?.distance || 0) / 1000);
    const ytdCount = stats.ytd_ride_totals?.count || 0;
    
    await supabase
      .from('profiles')
      .update({
        strava_monthly_stats: result,
        strava_ytd_distance: ytdDistanceKm,
        strava_ytd_count: ytdCount,
        strava_stats_cached_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log('Stats cached successfully');

    return new Response(
      JSON.stringify({ ...result, cached: false }),
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
