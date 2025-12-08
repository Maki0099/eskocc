import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64url decode helper
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

// Create JWT for VAPID
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBytes: Uint8Array,
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key for signing - build PKCS8 structure
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ]);
  const pkcs8Buffer = new ArrayBuffer(pkcs8Header.length + privateKeyBytes.length);
  const pkcs8 = new Uint8Array(pkcs8Buffer);
  pkcs8.set(pkcs8Header, 0);
  pkcs8.set(privateKeyBytes, pkcs8Header.length);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  // Convert signature to base64url
  const sigArray = new Uint8Array(signature);
  let signatureB64 = btoa(String.fromCharCode(...sigArray));
  signatureB64 = signatureB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return `${unsignedToken}.${signatureB64}`;
}

// Simple encryption for Web Push using fetch to push service
// Uses RFC 8291 aes128gcm content encoding
async function encryptPayload(
  payload: string,
  p256dhB64: string,
  authB64: string
): Promise<{ body: ArrayBuffer; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyBuffer = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);

  const userPublicKey = base64urlToUint8Array(p256dhB64);
  const userAuth = base64urlToUint8Array(authB64);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import user public key
  const userPubKey = await crypto.subtle.importKey(
    "raw",
    userPublicKey.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret via ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPubKey },
    localKeyPair.privateKey,
    256
  );

  // Key derivation using HKDF
  // ikm = HKDF-Extract(salt=auth, ikm=sharedSecret)
  const authInfo = encoder.encode("WebPush: info\0");
  const keyInfoBuffer = new ArrayBuffer(authInfo.length + userPublicKey.length + localPublicKey.length);
  const keyInfo = new Uint8Array(keyInfoBuffer);
  keyInfo.set(authInfo, 0);
  keyInfo.set(userPublicKey, authInfo.length);
  keyInfo.set(localPublicKey, authInfo.length + userPublicKey.length);

  // Import auth secret as HKDF key
  const authKey = await crypto.subtle.importKey(
    "raw",
    userAuth.buffer as ArrayBuffer,
    "HKDF",
    false,
    ["deriveBits"]
  );

  // First HKDF: derive IKM from shared secret using auth as salt
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "HKDF",
    false,
    ["deriveBits"]
  );

  // Derive PRK
  const prkBits = await crypto.subtle.deriveBits(
    { 
      name: "HKDF", 
      hash: "SHA-256", 
      salt: userAuth.buffer as ArrayBuffer, 
      info: keyInfoBuffer
    },
    ikmKey,
    256
  );

  const prkKey = await crypto.subtle.importKey(
    "raw",
    prkBits,
    "HKDF",
    false,
    ["deriveBits"]
  );

  // Derive CEK (content encryption key)
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const cekBits = await crypto.subtle.deriveBits(
    { 
      name: "HKDF", 
      hash: "SHA-256", 
      salt: salt.buffer as ArrayBuffer, 
      info: cekInfo 
    },
    prkKey,
    128
  );

  // Derive nonce
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    { 
      name: "HKDF", 
      hash: "SHA-256", 
      salt: salt.buffer as ArrayBuffer, 
      info: nonceInfo 
    },
    prkKey,
    96
  );

  // Create AES-GCM key
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cekBits,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  // Add padding delimiter (0x02 for last record)
  const paddedPayloadBuffer = new ArrayBuffer(payloadBytes.length + 1);
  const paddedPayload = new Uint8Array(paddedPayloadBuffer);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 2;

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBits },
    aesKey,
    paddedPayloadBuffer
  );

  // Build aes128gcm body: salt (16) + rs (4) + idlen (1) + keyid (65) + encrypted
  const recordSize = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, recordSize, false);
  
  const bodyBuffer = new ArrayBuffer(16 + 4 + 1 + localPublicKey.length + encrypted.byteLength);
  const body = new Uint8Array(bodyBuffer);
  let offset = 0;
  body.set(salt, offset); offset += 16;
  body.set(rsBytes, offset); offset += 4;
  body[offset] = localPublicKey.length; offset += 1;
  body.set(localPublicKey, offset); offset += localPublicKey.length;
  body.set(new Uint8Array(encrypted), offset);

  return { body: bodyBuffer, salt, localPublicKey };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, eventId, eventTitle, message } = await req.json();

    console.log(`Sending push notification: type=${type}, eventId=${eventId}`);

    // Get VAPID keys
    const { data: vapidKeys, error: vapidError } = await supabase
      .from('vapid_keys')
      .select('public_key, private_key')
      .limit(1)
      .single();

    if (vapidError || !vapidKeys) {
      console.error('VAPID keys not found:', vapidError);
      throw new Error('VAPID keys not configured');
    }

    // Get all member subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only members
    const { data: memberRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['member', 'active_member', 'admin']);

    const memberUserIds = new Set((memberRoles || []).map(r => r.user_id));
    const memberSubscriptions = subscriptions.filter(s => memberUserIds.has(s.user_id));

    console.log(`Found ${memberSubscriptions.length} member subscriptions`);

    // Prepare notification payload
    let title = 'Esko.cc';
    let body = message || '';
    
    switch (type) {
      case 'new_event':
        title = '🚴 Nová vyjížďka';
        body = eventTitle || 'Byla přidána nová vyjížďka';
        break;
      case 'event_updated':
        title = '📝 Změna vyjížďky';
        body = eventTitle ? `${eventTitle} byla upravena` : 'Vyjížďka byla upravena';
        break;
      case 'event_reminder':
        title = '⏰ Připomínka vyjížďky';
        body = eventTitle ? `Zítra: ${eventTitle}` : 'Zítra se koná vyjížďka';
        break;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: {
        type,
        eventId,
        url: eventId ? `/events/${eventId}` : '/events'
      }
    });

    const privateKeyBytes = base64urlToUint8Array(vapidKeys.private_key);

    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of memberSubscriptions) {
      try {
        const url = new URL(sub.endpoint);
        const audience = `${url.protocol}//${url.host}`;

        const jwt = await createVapidJwt(
          audience,
          'mailto:info@eskocc.cz',
          privateKeyBytes
        );

        const { body: encryptedBody } = await encryptPayload(
          payload,
          sub.p256dh,
          sub.auth
        );

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `vapid t=${jwt}, k=${vapidKeys.public_key}`,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400'
          },
          body: encryptedBody
        });

        if (response.ok || response.status === 201) {
          successCount++;
        } else if (response.status === 410 || response.status === 404) {
          failedEndpoints.push(sub.endpoint);
          failCount++;
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${response.status}`);
          failCount++;
        }
      } catch (error) {
        console.error(`Error sending to ${sub.endpoint}:`, error);
        failCount++;
      }
    }

    // Clean up expired subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
      console.log(`Cleaned up ${failedEndpoints.length} expired subscriptions`);
    }

    console.log(`Push notifications sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ sent: successCount, failed: failCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in push-send:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
