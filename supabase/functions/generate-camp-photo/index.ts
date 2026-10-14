import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { route_id } = await req.json();
    if (typeof route_id !== "string") return json({ error: "route_id required" }, 400);
    const { data: route } = await admin.from("camp_routes").select("*").eq("id", route_id).single();
    if (!route) return json({ error: "Route not found" }, 404);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI not configured" }, 500);
    const prompt = `Photorealistic landscape photo of road cycling in Mallorca, Spain, for a route called "${route.title}". ${route.description?.slice(0, 400) ?? ""} ${route.distance_km} km, ${route.elevation_m} m climbing, ${route.terrain} terrain. Mediterranean scenery, sunny, cyclists on the road, no text.`;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: "AI request failed", status: r.status, details: t }, r.status);
    }
    const data = await r.json();
    const img: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!img) return json({ error: "No image returned" }, 502);
    const b64 = img.split(",")[1];
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `camp/${route.slug}/ai-${Date.now()}.png`;
    const { error: upErr } = await admin.storage.from("routes").upload(path, bytes, { contentType: "image/png" });
    if (upErr) return json({ error: upErr.message }, 500);
    const fileUrl = admin.storage.from("routes").getPublicUrl(path).data.publicUrl;
    await admin.from("camp_route_photos").insert({ route_id, file_url: fileUrl, is_ai: true, sort_order: 999, caption: "Ilustrační foto (AI)" });
    if (!route.cover_image_url) await admin.from("camp_routes").update({ cover_image_url: fileUrl }).eq("id", route_id);
    return json({ ok: true, url: fileUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
