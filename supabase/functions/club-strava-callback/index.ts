import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const appUrl = url.origin.includes("supabase.co")
      ? "https://eskocc.lovable.app"
      : url.origin;

    if (error || !code || !state) {
      return Response.redirect(
        `${appUrl}/admin?club_strava=error&reason=${error || "missing_params"}`,
        302
      );
    }

    if (!state.startsWith("club_admin:")) {
      return Response.redirect(`${appUrl}/admin?club_strava=error&reason=invalid_state`, 302);
    }

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID"),
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error("Strava token exchange failed:", t);
      return Response.redirect(`${appUrl}/admin?club_strava=error&reason=token_exchange`, 302);
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(tokens.expires_at * 1000).toISOString();
    const athleteId = String(tokens.athlete?.id || "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert single-row credentials (delete then insert)
    await supabase.from("club_api_credentials").delete().not("id", "is", null);
    const { error: insErr } = await supabase.from("club_api_credentials").insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      athlete_id: athleteId,
    });

    if (insErr) {
      console.error("DB insert error:", insErr);
      return Response.redirect(`${appUrl}/admin?club_strava=error&reason=db`, 302);
    }

    return Response.redirect(`${appUrl}/admin?club_strava=connected`, 302);
  } catch (err) {
    console.error("club-strava-callback error:", err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
