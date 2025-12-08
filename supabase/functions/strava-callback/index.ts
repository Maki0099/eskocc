import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This is the user ID
    const error = url.searchParams.get('error');

    // Get the frontend URL for redirects
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://eskocc.cz';

    if (error) {
      console.error('Strava OAuth error:', error);
      return Response.redirect(`${frontendUrl}/account?strava=error&message=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return Response.redirect(`${frontendUrl}/account?strava=error&message=missing_params`, 302);
    }

    const clientId = Deno.env.get('STRAVA_CLIENT_ID');
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return Response.redirect(`${frontendUrl}/account?strava=error&message=config_error`, 302);
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return Response.redirect(`${frontendUrl}/account?strava=error&message=token_error`, 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, athlete ID:', tokenData.athlete?.id);

    const athleteId = tokenData.athlete?.id?.toString();
    if (!athleteId) {
      console.error('No athlete ID in response');
      return Response.redirect(`${frontendUrl}/account?strava=error&message=no_athlete`, 302);
    }

    // Update user profile with Strava ID
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ strava_id: athleteId })
      .eq('id', state);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return Response.redirect(`${frontendUrl}/account?strava=error&message=update_error`, 302);
    }

    console.log('Successfully linked Strava account for user:', state);
    return Response.redirect(`${frontendUrl}/account?strava=success`, 302);

  } catch (error) {
    console.error('Error in strava-callback:', error);
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://eskocc.cz';
    return Response.redirect(`${frontendUrl}/account?strava=error&message=unknown`, 302);
  }
});
