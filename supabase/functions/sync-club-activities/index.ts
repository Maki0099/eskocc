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
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const newExpires = new Date(data.expires_at * 1000).toISOString();

  await supabase
    .from("club_api_credentials")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credId);

  return data.access_token;
}

function buildFingerprint(
  firstname: string,
  lastInit: string,
  date: string,
  distance: number
): string {
  return `${firstname.toLowerCase()}|${lastInit.toLowerCase()}|${date.slice(0, 10)}|${Math.round(distance)}`;
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tryMatch(
  firstname: string,
  lastInit: string,
  profiles: Array<{ id: string; full_name: string | null; nickname: string | null; club_match_name: string | null }>
): string | null {
  const f = normalize(firstname);
  const li = normalize(lastInit);

  for (const p of profiles) {
    const candidates = [p.full_name, p.nickname, p.club_match_name]
      .filter(Boolean)
      .map((s) => normalize(s as string));

    for (const c of candidates) {
      if (c === f) return p.id;
      if (c.startsWith(f + " ") && (li === "" || c.includes(" " + li))) return p.id;
      const parts = c.split(/\s+/);
      if (parts[0] === f && (li === "" || (parts[1] && parts[1].startsWith(li)))) {
        return p.id;
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get credentials
    const { data: creds, error: credsErr } = await supabase
      .from("club_api_credentials")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (credsErr) throw credsErr;
    if (!creds) {
      return new Response(
        JSON.stringify({ error: "No club credentials configured. Connect admin Strava account first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await refreshIfNeeded(supabase, creds, creds.id);

    // 2. Fetch club activities (paginate up to 200)
    const allActs: any[] = [];
    for (let page = 1; page <= 1; page++) {
      const r = await fetch(
        `https://www.strava.com/api/v3/clubs/${CLUB_ID}/activities?per_page=200&page=${page}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Strava API error ${r.status}: ${t}`);
      }
      const acts = await r.json();
      allActs.push(...acts);
      if (acts.length < 200) break;
    }

    console.log(`Fetched ${allActs.length} club activities`);

    // 3. Get profiles for matching
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, nickname, club_match_name");

    // 4. Upsert activities (dedup by fingerprint)
    let inserted = 0;
    let matched = 0;
    const today = new Date().toISOString();

    for (const a of allActs) {
      const firstname = a.athlete?.firstname || "";
      const lastInit = a.athlete?.lastname || "";
      const fullName = `${firstname} ${lastInit}`.trim();
      const distance = Math.round(a.distance || 0);
      const fp = buildFingerprint(firstname, lastInit, today, distance);

      const matchedUserId = profiles ? tryMatch(firstname, lastInit, profiles) : null;
      if (matchedUserId) matched++;

      const { error: upErr } = await supabase
        .from("club_activities")
        .upsert(
          {
            fingerprint: fp,
            athlete_firstname: firstname,
            athlete_lastname_initial: lastInit,
            athlete_full: fullName,
            matched_user_id: matchedUserId,
            activity_date: today,
            distance_m: distance,
            moving_time: a.moving_time || 0,
            elevation_gain: Math.round(a.total_elevation_gain || 0),
            sport_type: a.sport_type || a.type || null,
          },
          { onConflict: "fingerprint", ignoreDuplicates: false }
        );

      if (!upErr) inserted++;
    }

    // 5. Recalculate YTD per matched user
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1).toISOString();

    const { data: matchedUsers } = await supabase
      .from("club_activities")
      .select("matched_user_id, distance_m")
      .not("matched_user_id", "is", null)
      .gte("activity_date", yearStart);

    const totals = new Map<string, { dist: number; count: number }>();
    for (const r of matchedUsers || []) {
      const u = r.matched_user_id!;
      const cur = totals.get(u) || { dist: 0, count: 0 };
      cur.dist += r.distance_m;
      cur.count += 1;
      totals.set(u, cur);
    }

    const cachedAt = new Date().toISOString();
    for (const [uid, t] of totals) {
      await supabase
        .from("profiles")
        .update({
          strava_ytd_distance: Math.round(t.dist),
          strava_ytd_count: t.count,
          strava_stats_cached_at: cachedAt,
        })
        .eq("id", uid);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetched: allActs.length,
        upserted: inserted,
        matched,
        users_updated: totals.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-club-activities error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
