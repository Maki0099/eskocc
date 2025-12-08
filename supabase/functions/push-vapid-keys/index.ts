import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  // Convert to base64url
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // For private key, we need to extract just the 32-byte key from PKCS8
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  // PKCS8 for P-256 has the private key at offset 36, length 32
  const privateKeyBytes = privateKeyArray.slice(36, 68);
  const privateKey = btoa(String.fromCharCode(...privateKeyBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { publicKey, privateKey };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if VAPID keys already exist
    const { data: existingKeys, error: fetchError } = await supabase
      .from('vapid_keys')
      .select('public_key')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching VAPID keys:', fetchError);
      throw fetchError;
    }

    if (existingKeys) {
      console.log('Returning existing VAPID public key');
      return new Response(
        JSON.stringify({ publicKey: existingKeys.public_key }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new VAPID keys
    console.log('Generating new VAPID keys...');
    const { publicKey, privateKey } = await generateVapidKeys();

    // Store in database
    const { error: insertError } = await supabase
      .from('vapid_keys')
      .insert({ public_key: publicKey, private_key: privateKey });

    if (insertError) {
      console.error('Error storing VAPID keys:', insertError);
      throw insertError;
    }

    console.log('VAPID keys generated and stored successfully');
    return new Response(
      JSON.stringify({ publicKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in push-vapid-keys:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
