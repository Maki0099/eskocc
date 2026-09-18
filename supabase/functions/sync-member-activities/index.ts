import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trigger-source, x-user-id",
};

interface TokenRow {
  user_id: string;
  athlete_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  needs_reauth: boolean;
}

async function refreshIfNeeded(supabase: any, row: TokenRow): Promise<string | null> {
  if (new Date(row.expires_at).getTime() > Date.now() + 60_000) return row.access_token;

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
    await supabase
      .from("user_strava_tokens")
      .update({
        needs_reauth: res.status === 400 || res.status === 401,
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

async function authorize(
  req: Request
): Promise<{ ok: boolean; reason?: string; targetUserId?: string | null; triggeredBy: string }> {
  const triggerSource = (req.headers.get("x-trigger-source") || "").toLowerCase();
  if (triggerSource === "pg-cron") return { ok: true, targetUserId: null, triggeredBy: "cron" };
  if (triggerSource === "user-connect") {
    return { ok: true, targetUserId: req.headers.get("x-user-id"), triggeredBy: "user-connect" };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, reason: "missing_auth", triggeredBy: "unknown" };
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return { ok: true, targetUserId: req.headers.get("x-user-id"), triggeredBy: "service" };
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { ok: false, reason: "invalid_jwt", triggeredBy: "unknown" };

  const { data: isAdmin } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  const url = new URL(req.url);
  const requested = url.searchParams.get("user_id");
  if (isAdmin) return { ok: true, targetUserId: requested, triggeredBy: `admin:${user.id}` };
  return { ok: true, targetUserId: user.id, triggeredBy: `member:${user.id}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  const auth = await authorize(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "Unauthorized", reason: auth.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

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

  const yearStart = Math.floor(new Date(new Date().getUTCFullYear(), 0, 1).getTime() / 1000);
  const results: { user_id: string; ok: boolean; reason?: string; imported?: number }[] = [];

  for (const row of (rows || []) as TokenRow[]) {
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

      const activities: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const res = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?after=${yearStart}&per_page=100&page=${page}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) {
          const t = await res.text();
          await supabase
            .from("user_strava_tokens")
            .update({ last_error: `activities ${res.status}: ${t.slice(0, 200)}` })
            .eq("user_id", row.user_id);
          throw new Error(`activities_${res.status}`);
        }
        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        activities.push(...batch);
        if (batch.length < 100) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      const activityRows = activities.map((a) => ({
        user_id: row.user_id,
        strava_activity_id: String(a.id),
        name: a.name ?? null,
        activity_date: a.start_date_local || a.start_date,
        distance_m: Math.round(a.distance || 0),
        moving_time: Math.round(a.moving_time || 0),
        elevation_gain: Math.round(a.total_elevation_gain || 0),
        sport_type: a.sport_type || a.type || null,
        elapsed_time: a.elapsed_time ? Math.round(a.elapsed_time) : null,
        average_speed: a.average_speed ?? null,
        max_speed: a.max_speed ?? null,
        average_heartrate: a.average_heartrate ?? null,
        max_heartrate: a.max_heartrate ?? null,
        average_watts: a.average_watts ?? null,
        average_cadence: a.average_cadence ?? null,
        calories: a.calories ?? a.kilojoules ?? null,
        suffer_score: a.suffer_score ?? null,
        is_trainer: Boolean(a.trainer),
        is_commute: Boolean(a.commute),
        is_race: a.workout_type === 1 || a.workout_type === 11,
        start_lat: Array.isArray(a.start_latlng) ? a.start_latlng[0] ?? null : null,
        start_lng: Array.isArray(a.start_latlng) ? a.start_latlng[1] ?? null : null,
        map_polyline: a.map?.summary_polyline ?? null,
      }));

      if (activityRows.length > 0) {
        const { error: upErr } = await supabase
          .from("member_activities")
          .upsert(activityRows, { onConflict: "strava_activity_id" });
        if (upErr) throw upErr;
      }

      await supabase
        .from("user_strava_tokens")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("user_id", row.user_id);

      results.push({ user_id: row.user_id, ok: true, imported: activityRows.length });
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      results.push({ user_id: row.user_id, ok: false, reason: (e as Error).message });
    }
  }

  const { data: recalc } = await supabase.rpc("recalc_member_ytd");
  const recalcRow = Array.isArray(recalc) ? recalc[0] : recalc;

  const okCount = results.filter((r) => r.ok).length;
  await supabase.from("club_sync_log").insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: results.length === 0 || okCount > 0 ? "success" : "error",
    triggered_by: `member-activities:${auth.triggeredBy}`,
    fetched_count: results.reduce((s, r) => s + (r.imported || 0), 0),
    new_activities: results.reduce((s, r) => s + (r.imported || 0), 0),
    ytd_users_updated: recalcRow?.users_updated ?? 0,
    ytd_users_zeroed: recalcRow?.users_zeroed ?? 0,
    error_message: okCount === 0 && results.length > 0 ? results[0].reason ?? null : null,
  });

  return new Response(
    JSON.stringify({
      processed: results.length,
      ok: okCount,
      users_updated: recalcRow?.users_updated ?? 0,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

