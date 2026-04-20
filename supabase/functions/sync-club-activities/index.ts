import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CLUB_ID = "1860524";

interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

class ReauthRequiredError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ReauthRequiredError";
  }
}

async function refreshIfNeeded(
  supabase: any,
  token: StravaToken,
  credId: string
): Promise<string> {
  const expiresAt = new Date(token.expires_at).getTime();
  if (expiresAt > Date.now() + 60_000) return token.access_token;

  console.log("Refreshing Strava token...");
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    // 400/401 from Strava on refresh = token revoked / invalid_grant → mark for re-auth.
    if (res.status === 400 || res.status === 401) {
      await supabase
        .from("club_api_credentials")
        .update({
          needs_reauth: true,
          last_error: `Refresh failed (${res.status}): ${body.slice(0, 300)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", credId);
      throw new ReauthRequiredError(
        "Strava token byl odvolán nebo vypršel. Klikni 'Přepojit' v adminu."
      );
    }
    throw new Error(`Token refresh failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const newExpires = new Date(data.expires_at * 1000).toISOString();

  await supabase
    .from("club_api_credentials")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: newExpires,
      needs_reauth: false,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credId);

  return data.access_token;
}

function buildAthleteKey(firstname: string, lastInit: string): string {
  return `${firstname.trim().toLowerCase()}|${(lastInit || "").trim().toLowerCase()}`;
}

function buildFingerprint(
  firstname: string,
  lastInit: string,
  distance: number,
  movingTime: number,
  elevation: number,
  sportType: string
): string {
  return [
    firstname.trim().toLowerCase(),
    (lastInit || "").trim().toLowerCase(),
    Math.round(distance),
    Math.round(movingTime),
    Math.round(elevation),
    (sportType || "").toLowerCase(),
  ].join("|");
}

async function authorize(
  req: Request
): Promise<{ ok: boolean; reason?: string; triggeredBy: string }> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!token) return { ok: false, reason: "missing_auth", triggeredBy: "unknown" };
  if (token === serviceKey) return { ok: true, triggeredBy: "cron" };

  if (!anonKey) return { ok: false, reason: "server_misconfig", triggeredBy: "unknown" };
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { ok: false, reason: "invalid_token", triggeredBy: "unknown" };

  const adminSupa = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: role } = await adminSupa
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return { ok: false, reason: "not_admin", triggeredBy: user.id };
  return { ok: true, triggeredBy: `admin:${user.id}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await authorize(req);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", reason: auth.reason }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create sync log row first so we always have an audit record, even on failure.
  const { data: logRow } = await supabase
    .from("club_sync_log")
    .insert({ status: "running", triggered_by: auth.triggeredBy })
    .select("id")
    .single();
  const logId: string | null = logRow?.id ?? null;

  const finalize = async (patch: Record<string, unknown>) => {
    if (!logId) return;
    await supabase
      .from("club_sync_log")
      .update({ ...patch, finished_at: new Date().toISOString() })
      .eq("id", logId);
  };

  try {
    const { data: creds, error: credsErr } = await supabase
      .from("club_api_credentials")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (credsErr) throw credsErr;
    if (!creds) {
      await finalize({ status: "error", error_message: "no_credentials" });
      return new Response(
        JSON.stringify({ error: "No club credentials configured. Connect admin Strava account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (creds.needs_reauth) {
      await finalize({ status: "error", error_message: "needs_reauth" });
      return new Response(
        JSON.stringify({
          error: "Strava token byl odvolán. Otevři admin → Strava klub a klikni 'Přepojit'.",
          needs_reauth: true,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await refreshIfNeeded(supabase, creds, creds.id);

    const fetchWithRetry = async (
      url: string,
      init: RequestInit,
      maxAttempts = 4
    ): Promise<Response> => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fetch(url, init);
        } catch (e) {
          lastErr = e;
          const delay = 500 * Math.pow(2, attempt - 1);
          console.warn(`fetch attempt ${attempt}/${maxAttempts} failed: ${(e as Error).message}. Retrying in ${delay}ms`);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    };

    const r = await fetchWithRetry(
      `https://www.strava.com/api/v3/clubs/${CLUB_ID}/activities?per_page=200&page=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Strava API error ${r.status}: ${t}`);
    }
    const allActs: any[] = await r.json();
    if (!Array.isArray(allActs)) throw new Error("Unexpected Strava response shape");
    console.log(`Fetched ${allActs.length} club activities`);

    const { data: mappings } = await supabase
      .from("club_athlete_mappings")
      .select("athlete_key, matched_user_id, ignored");

    const mappingByKey = new Map<string, { matched_user_id: string | null; ignored: boolean }>();
    for (const m of mappings || []) {
      mappingByKey.set(m.athlete_key, { matched_user_id: m.matched_user_id, ignored: m.ignored });
    }

    const syncedAt = new Date().toISOString();
    const newMappings = new Map<string, { firstname: string; lastInit: string }>();
    const seenFp = new Set<string>();
    const rows: any[] = [];
    let matched = 0;

    for (const a of allActs) {
      const firstname = a.athlete?.firstname || "";
      const lastInit = a.athlete?.lastname || "";
      if (!firstname && !lastInit) continue;
      const fullName = `${firstname} ${lastInit}`.trim();
      const distance = Math.round(a.distance || 0);
      const movingTime = a.moving_time || 0;
      const elevation = Math.round(a.total_elevation_gain || 0);
      const sportType = a.sport_type || a.type || "";
      const fp = buildFingerprint(firstname, lastInit, distance, movingTime, elevation, sportType);

      if (seenFp.has(fp)) continue;
      seenFp.add(fp);

      const key = buildAthleteKey(firstname, lastInit);

      let matchedUserId: string | null = null;
      const existing = mappingByKey.get(key);
      if (existing && !existing.ignored) {
        matchedUserId = existing.matched_user_id;
      } else if (!existing) {
        newMappings.set(key, { firstname, lastInit });
      }

      if (matchedUserId) matched++;

      rows.push({
        fingerprint: fp,
        athlete_firstname: firstname,
        athlete_lastname_initial: lastInit,
        athlete_full: fullName,
        matched_user_id: matchedUserId,
        activity_date: syncedAt,
        distance_m: distance,
        moving_time: movingTime,
        elevation_gain: elevation,
        sport_type: sportType || null,
      });
    }

    let upserted = 0;
    if (rows.length > 0) {
      const { error: upErr, count } = await supabase
        .from("club_activities")
        .upsert(rows, { onConflict: "fingerprint", ignoreDuplicates: false, count: "exact" });
      if (upErr) throw upErr;
      upserted = count ?? rows.length;
    }

    if (newMappings.size > 0) {
      const mappingRows = Array.from(newMappings.entries()).map(([athlete_key, v]) => ({
        athlete_key,
        athlete_firstname: v.firstname,
        athlete_lastname_initial: v.lastInit,
        matched_user_id: null,
      }));
      await supabase
        .from("club_athlete_mappings")
        .upsert(mappingRows, { onConflict: "athlete_key", ignoreDuplicates: true });
      console.log(`Created ${mappingRows.length} new athlete mappings`);
    }

    const { data: recalc, error: recalcErr } = await supabase.rpc("recalc_club_ytd");
    if (recalcErr) throw recalcErr;
    const recalcRow = Array.isArray(recalc) ? recalc[0] : recalc;

    await finalize({
      status: "success",
      fetched_count: allActs.length,
      new_activities: upserted,
      new_athletes: newMappings.size,
      ytd_users_updated: recalcRow?.users_updated ?? 0,
      ytd_users_zeroed: recalcRow?.users_zeroed ?? 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        fetched: allActs.length,
        upserted,
        matched,
        new_athletes: newMappings.size,
        users_updated: recalcRow?.users_updated ?? 0,
        users_zeroed: recalcRow?.users_zeroed ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-club-activities error:", err);
    const isReauth = err instanceof ReauthRequiredError;
    await finalize({
      status: isReauth ? "needs_reauth" : "error",
      error_message: (err as Error).message?.slice(0, 1000) ?? "unknown",
    });
    return new Response(
      JSON.stringify({ error: (err as Error).message, needs_reauth: isReauth }),
      {
        status: isReauth ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
