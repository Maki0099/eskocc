import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { activity_id, user_id } = await req.json();
    if (!activity_id) {
      return new Response(JSON.stringify({ error: "activity_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update activity match
    const { error: upErr } = await adminSupa
      .from("club_activities")
      .update({ matched_user_id: user_id || null })
      .eq("id", activity_id);

    if (upErr) throw upErr;

    // Recalc YTD for affected user(s)
    const usersToRecalc = new Set<string>();
    if (user_id) usersToRecalc.add(user_id);

    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1).toISOString();
    const cachedAt = new Date().toISOString();

    for (const uid of usersToRecalc) {
      const { data: rows } = await adminSupa
        .from("club_activities")
        .select("distance_m")
        .eq("matched_user_id", uid)
        .gte("activity_date", yearStart);

      const dist = (rows || []).reduce((s, r) => s + (r.distance_m || 0), 0);
      const count = (rows || []).length;

      await adminSupa
        .from("profiles")
        .update({
          strava_ytd_distance: Math.round(dist),
          strava_ytd_count: count,
          strava_stats_cached_at: cachedAt,
        })
        .eq("id", uid);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
