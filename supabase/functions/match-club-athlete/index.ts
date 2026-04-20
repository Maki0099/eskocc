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

    const { athlete_key, user_id, ignored } = await req.json();
    if (!athlete_key) {
      return new Response(JSON.stringify({ error: "athlete_key required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Load mapping (need firstname + lastname_initial for activity update)
    const { data: mapping, error: mapErr } = await adminSupa
      .from("club_athlete_mappings")
      .select("*")
      .eq("athlete_key", athlete_key)
      .maybeSingle();

    if (mapErr) throw mapErr;
    if (!mapping) {
      return new Response(JSON.stringify({ error: "Athlete mapping not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const previousUserId = mapping.matched_user_id as string | null;
    const newUserId: string | null = ignored ? null : (user_id || null);

    // 2. Update mapping
    const { error: updMapErr } = await adminSupa
      .from("club_athlete_mappings")
      .update({
        matched_user_id: newUserId,
        ignored: !!ignored,
        updated_at: new Date().toISOString(),
      })
      .eq("athlete_key", athlete_key);

    if (updMapErr) throw updMapErr;

    // 3. Bulk update all club_activities for this athlete
    const { error: bulkErr } = await adminSupa
      .from("club_activities")
      .update({ matched_user_id: newUserId })
      .eq("athlete_firstname", mapping.athlete_firstname)
      .eq("athlete_lastname_initial", mapping.athlete_lastname_initial || "");

    if (bulkErr) throw bulkErr;

    // 4. Atomic batch YTD recalc (handles old user, new user, and zeros members without activities)
    const { data: recalc, error: recalcErr } = await adminSupa.rpc("recalc_club_ytd");
    if (recalcErr) throw recalcErr;
    const recalcRow = Array.isArray(recalc) ? recalc[0] : recalc;

    return new Response(
      JSON.stringify({
        success: true,
        users_updated: recalcRow?.users_updated ?? 0,
        users_zeroed: recalcRow?.users_zeroed ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
