import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, name, check } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || token.length < 16 || token.length > 64) {
      return json({ error: "invalid" }, 400);
    }
    const guestName = typeof name === "string" ? name.trim().slice(0, 80) : "";
    if (!check && guestName.length < 2) return json({ error: "name" }, 400);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: link } = await admin
      .from("guest_access_links")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (!link || link.revoked_at || new Date(link.expires_at) <= new Date()) {
      return json({ error: "expired" }, 410);
    }
    if (check) return json({ ok: true, label: link.label, expires_at: link.expires_at });

    const email = `guest-${link.id}@guest.eskocc.cz`;
    let guestId = link.guest_user_id as string | null;
    if (!guestId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { full_name: `Host – ${link.label}` },
      });
      if (error || !created.user) throw error ?? new Error("create failed");
      guestId = created.user.id;
      // trigger creates 'pending' role → switch to guest
      await admin.from("user_roles").delete().eq("user_id", guestId);
      await admin.from("user_roles").insert({ user_id: guestId, role: "guest" });
    }

    const { data: gen, error: genErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (genErr) throw genErr;

    await admin
      .from("guest_access_links")
      .update({
        guest_user_id: guestId,
        use_count: (link.use_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", link.id);
    await admin.from("guest_access_visits").insert({
      link_id: link.id,
      guest_name: guestName,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
    });


    return json({ token_hash: gen.properties.hashed_token, expires_at: link.expires_at });
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
