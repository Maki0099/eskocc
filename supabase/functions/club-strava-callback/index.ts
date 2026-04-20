import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// State format: "club_admin:<userId>:<base64url(returnTo)>"
function parseState(state: string): { userId: string | null; returnTo: string | null } {
  if (!state.startsWith("club_admin:")) return { userId: null, returnTo: null };
  const parts = state.split(":");
  const userId = parts[1] || null;
  let returnTo: string | null = null;
  if (parts[2]) {
    try {
      const b64 = parts[2].replace(/-/g, "+").replace(/_/g, "/");
      returnTo = atob(b64);
    } catch {
      returnTo = null;
    }
  }
  return { userId, returnTo };
}

// Allow only http(s) URLs to known Lovable / custom domains; never open redirect.
function safeReturnTo(returnTo: string | null): string {
  const fallback = "https://eskocc.lovable.app";
  if (!returnTo) return fallback;
  try {
    const u = new URL(returnTo);
    if (u.protocol !== "https:" && u.protocol !== "http:") return fallback;
    const host = u.hostname.toLowerCase();
    const allowed =
      host === "eskocc.lovable.app" ||
      host === "www.eskocc.cz" ||
      host === "eskocc.cz" ||
      host.endsWith(".lovable.app");
    if (!allowed) return fallback;
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") || "";
    const error = url.searchParams.get("error");

    const { userId, returnTo } = parseState(state);
    const appUrl = safeReturnTo(returnTo);

    if (error || !code || !state) {
      return Response.redirect(
        `${appUrl}/admin?club_strava=error&reason=${error || "missing_params"}`,
        302
      );
    }

    if (!userId) {
      return Response.redirect(`${appUrl}/admin?club_strava=error&reason=invalid_state`, 302);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the userId from state really has admin role.
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return Response.redirect(`${appUrl}/admin?club_strava=error&reason=not_admin`, 302);
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

    await supabase.from("club_api_credentials").delete().not("id", "is", null);
    const { error: insErr } = await supabase.from("club_api_credentials").insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      athlete_id: athleteId,
      needs_reauth: false,
      last_error: null,
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
