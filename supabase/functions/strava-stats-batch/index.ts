import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trigger-source, x-user-id",
};

interface TokenRow {
  user_id: string;
  athlete_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function refreshIfNeeded(supabase: any, row: TokenRow): Promise<string | null> {
  const expiresAt = new Date(row.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) return row.access_token;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const needsReauth = res.status === 400 || res.status === 401;
    await supabase
      .from("user_strava_tokens")
      .update({
        needs_reauth: needsReauth,
        last_error: `Refresh failed (${res.status}): ${body.slice(0, 300)}`,
      })
      .eq("user_id", row.user_id);
    return null;
  }

  const data = await res.json();
  await supabase
    .from("user_strava_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(data.expires_at * 1000).toISOString(),
      needs_reauth: false,
      last_error: null,
    })
    .eq("user_id", row.user_id);
  return data.access_token as string;
}

async function authorize(req: Request, supabase: any): Promise<{ ok: boolean; reason?: string; targetUserId?: string | null }> {
  const triggerSource = (req.headers.get("x-trigger-source") || "").toLowerCase();
  if (triggerSource === "pg-cron" || triggerSource === "user-connect") {
    return { ok: true, targetUserId: req.headers.get("x-user-id") };
  }
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, reason: "missing_auth" };
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return { ok: true, targetUserId: req.headers.get("x-user-id") };
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { ok: false, reason: "invalid_jwt" };

  const { data: isAdmin } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  // Admin může spustit pro kohokoli (?user_id=), běžný uživatel jen pro sebe
  const url = new URL(req.url);
  const requested = url.searchParams.get("user_id");
  if (isAdmin) return { ok: true, targetUserId: requested || null };
  return { ok: true, targetUserId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = new Date().toISOString();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const auth = await authorize(req, supabase);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load token rows
  let query = supabase
    .from("user_strava_tokens")
    .select("user_id, athlete_id, access_token, refresh_token, expires_at, needs_reauth");
  if (auth.targetUserId) query = query.eq("user_id", auth.targetUserId);

  const { data: rows, error: loadErr } = await query;
  if (loadErr) {
    return new Response(JSON.stringify({ error: loadErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: { user_id: string; ok: boolean; reason?: string; distance?: number; count?: number }[] = [];

  for (const row of (rows || []) as (TokenRow & { needs_reauth: boolean })[]) {
    if (row.needs_reauth) {
      results.push({ user_id: row.user_id, ok: false, reason: "needs_reauth" });
      continue;
    }
    try {
      const accessToken = await refreshIfNeeded(supabase, row);
      if (!accessToken) {
        results.push({ user_id: row.user_id, ok: false, reason: "refresh_failed" });
        continue;
      }

      const statsRes = await fetch(
        `https://www.strava.com/api/v3/athletes/${row.athlete_id}/stats`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!statsRes.ok) {
        const t = await statsRes.text();
        await supabase
          .from("user_strava_tokens")
          .update({ last_error: `stats ${statsRes.status}: ${t.slice(0, 200)}` })
          .eq("user_id", row.user_id);
        results.push({ user_id: row.user_id, ok: false, reason: `stats_${statsRes.status}` });
        continue;
      }
      const stats = await statsRes.json();
      const ytd = stats?.ytd_ride_totals || { distance: 0, count: 0 };
      const distanceKm = Math.round((ytd.distance || 0) / 1000);
      const count = ytd.count || 0;

      const now = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          personal_ytd_distance: distanceKm,
          personal_ytd_count: count,
          personal_stats_cached_at: now,
        })
        .eq("id", row.user_id);

      await supabase
        .from("user_strava_tokens")
        .update({ last_synced_at: now, last_error: null })
        .eq("user_id", row.user_id);

      results.push({ user_id: row.user_id, ok: true, distance: distanceKm, count });

      // Mild delay – Strava limit 100/15 min
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      results.push({ user_id: row.user_id, ok: false, reason: (e as Error).message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  await supabase.from("club_sync_log").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: "ok",
    triggered_by: "member-stats-batch",
    fetched_count: results.length,
    ytd_users_updated: okCount,
    ytd_users_zeroed: 0,
    error_message: null,
  });

  return new Response(JSON.stringify({ processed: results.length, ok: okCount, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
