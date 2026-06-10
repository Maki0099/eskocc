import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// State format: "member:<userId>:<base64url(returnTo)>"
function parseState(state: string): { userId: string | null; returnTo: string | null } {
  if (!state.startsWith("member:")) return { userId: null, returnTo: null };
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
        `${appUrl}/account?strava=error&reason=${error || "missing_params"}`,
        302
      );
    }
    if (!userId) {
      return Response.redirect(`${appUrl}/account?strava=error&reason=invalid_state`, 302);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Confirm user exists in profiles
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!prof) {
      return Response.redirect(`${appUrl}/account?strava=error&reason=no_profile`, 302);
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
      return Response.redirect(`${appUrl}/account?strava=error&reason=token_exchange`, 302);
    }

    const tokens = await tokenRes.json();
    const expiresAt = new Date(tokens.expires_at * 1000).toISOString();
    const athleteId = String(tokens.athlete?.id || "");

    const { error: upErr } = await supabase.from("user_strava_tokens").upsert({
      user_id: userId,
      athlete_id: athleteId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope || null,
      needs_reauth: false,
      last_error: null,
    });
    if (upErr) {
      console.error("DB upsert error:", upErr);
      return Response.redirect(`${appUrl}/account?strava=error&reason=db`, 302);
    }

    // Best-effort: spustit první sync hned (fire-and-forget)
    try {
      await supabase.functions.invoke("strava-stats-batch", {
        headers: { "x-trigger-source": "user-connect", "x-user-id": userId },
      });
    } catch (e) {
      console.warn("Initial sync failed (non-fatal):", e);
    }

    return Response.redirect(`${appUrl}/account?strava=connected`, 302);
  } catch (err) {
    console.error("user-strava-callback error:", err);
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
