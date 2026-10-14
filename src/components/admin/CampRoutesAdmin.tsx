import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Plus, Trash2, Sparkles, ImagePlus, Star, Eye, EyeOff } from "lucide-react";
import { parseGpxMetadata } from "@/lib/gpx-utils";
import { slugify } from "@/lib/beskydy-routes";
import {
  CAMP_BUCKET, CURRENT_CAMP, DIFFICULTY_LABEL, TERRAIN_LABEL, campFileUrl,
  type CampPhoto, type CampRoute,
} from "@/lib/camp-routes";

const empty = {
  title: "", slug: "", description: "", distance_km: 0, elevation_m: 0,
  difficulty: "medium", terrain: "road", camp_day: "", mapy_url: "", sort_order: 0, is_published: true,
};

const CampRoutesAdmin = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CampRoute | null>(null);
  const [form, setForm] = useState(empty);
  const [gpx, setGpx] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ["admin-camp-routes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camp_routes").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data as CampRoute[];
    },
  });
  const { data: photos = [] } = useQuery({
    queryKey: ["admin-camp-photos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("camp_route_photos").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data as CampPhoto[];
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-camp-routes"] });
    qc.invalidateQueries({ queryKey: ["admin-camp-photos"] });
    qc.invalidateQueries({ queryKey: ["camp-routes"] });
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: routes.length });
    setGpx(null);
    setOpen(true);
  };
  const openEdit = (r: CampRoute) => {
    setEditing(r);
    setForm({
      title: r.title, slug: r.slug, description: r.description, distance_km: r.distance_km,
      elevation_m: r.elevation_m, difficulty: r.difficulty, terrain: r.terrain,
      camp_day: r.camp_day?.toString() ?? "", mapy_url: r.mapy_url ?? "", sort_order: r.sort_order,
      is_published: r.is_published,
    });
    setGpx(null);
    setOpen(true);
  };

  const onGpx = async (f: File | null) => {
    setGpx(f);
    if (!f) return;
    const meta = await parseGpxMetadata(f);
    if (!meta) return toast.error("GPX se nepodařilo přečíst");
    setForm((s) => ({
      ...s,
      distance_km: Math.round(meta.distanceKm),
      elevation_m: Math.round(meta.elevationM),
      title: s.title || meta.name || "",
      slug: s.slug || slugify(meta.name || ""),
    }));
  };

  const save = async () => {
    const slug = form.slug || slugify(form.title);
    if (!form.title.trim() || !slug) return toast.error("Vyplň název");
    if (!editing && !gpx) return toast.error("Nahraj GPX soubor");
    setSaving(true);
    try {
      let gpx_path = editing?.gpx_path ?? "";
      if (gpx) {
        gpx_path = `camp/${slug}/${slug}.gpx`;
        const { error } = await supabase.storage.from(CAMP_BUCKET)
          .upload(gpx_path, gpx, { upsert: true, contentType: "application/gpx+xml" });
        if (error) throw error;
      }
      const payload = {
        camp: CURRENT_CAMP, slug, title: form.title.trim(), description: form.description,
        distance_km: Math.round(Number(form.distance_km) || 0),
        elevation_m: Math.round(Number(form.elevation_m) || 0),
        difficulty: form.difficulty, terrain: form.terrain,
        camp_day: form.camp_day ? parseInt(form.camp_day) : null,
        mapy_url: form.mapy_url.trim() || null, sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published, gpx_path,
      };
      const { error } = editing
        ? await supabase.from("camp_routes").update(payload).eq("id", editing.id)
        : await supabase.from("camp_routes").insert(payload);
      if (error) throw error;
      toast.success("Trasa uložena");
      setOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Uložení selhalo");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: CampRoute) => {
    if (!confirm(`Smazat trasu ${r.title}?`)) return;
    const { error } = await supabase.from("camp_routes").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const uploadPhotos = async (r: CampRoute, files: FileList | null) => {
    if (!files?.length) return;
    setBusy(r.id);
    try {
      for (const f of Array.from(files)) {
        const path = `camp/${r.slug}/${Date.now()}-${slugify(f.name.replace(/\.[^.]+$/, ""))}.${f.name.split(".").pop()}`;
        const { error } = await supabase.storage.from(CAMP_BUCKET).upload(path, f, { contentType: f.type });
        if (error) throw error;
        const url = campFileUrl(path);
        await supabase.from("camp_route_photos").insert({ route_id: r.id, file_url: url, sort_order: photos.length });
        if (!r.cover_image_url) {
          await supabase.from("camp_routes").update({ cover_image_url: url }).eq("id", r.id);
          r.cover_image_url = url;
        }
      }
      toast.success("Fotky nahrány");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Nahrání selhalo");
    } finally {
      setBusy(null);
    }
  };

  const generateAi = async (r: CampRoute) => {
    setBusy(r.id);
    const { error } = await supabase.functions.invoke("generate-camp-photo", { body: { route_id: r.id } });
    setBusy(null);
    if (error) return toast.error("Fotku se nepodařilo vygenerovat");
    toast.success("AI fotka vygenerována");
    refresh();
  };

  const setCover = async (r: CampRoute, url: string) => {
    await supabase.from("camp_routes").update({ cover_image_url: url }).eq("id", r.id);
    refresh();
  };
  const deletePhoto = async (p: CampPhoto, r: CampRoute) => {
    await supabase.from("camp_route_photos").delete().eq("id", p.id);
    if (r.cover_image_url === p.file_url) await supabase.from("camp_routes").update({ cover_image_url: null }).eq("id", r.id);
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trasy soustředění Mallorca</CardTitle>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Přidat trasu</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatím žádné trasy. Přidej první nahráním GPX.</p>
        ) : routes.map((r) => {
          const rp = photos.filter((p) => p.route_id === r.id);
          return (
            <div key={r.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {r.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    {r.camp_day ? `Den ${r.camp_day}: ` : ""}{r.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.distance_km} km · {r.elevation_m} m · {DIFFICULTY_LABEL[r.difficulty]} · {TERRAIN_LABEL[r.terrain]}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" asChild disabled={busy === r.id}>
                    <label className="cursor-pointer gap-2">
                      <ImagePlus className="w-4 h-4" />Fotky
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadPhotos(r, e.target.files)} />
                    </label>
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" disabled={busy === r.id} onClick={() => generateAi(r)}>
                    {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}AI fotka
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {rp.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {rp.map((p) => (
                    <div key={p.id} className="relative group">
                      <img src={p.file_url} alt="" className={`w-24 h-16 object-cover rounded ${r.cover_image_url === p.file_url ? "ring-2 ring-primary" : ""}`} />
                      <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-1 bg-background/70 rounded">
                        <button title="Nastavit jako hlavní" onClick={() => setCover(r, p.file_url)}><Star className="w-4 h-4" /></button>
                        <button title="Smazat" onClick={() => deletePhoto(p, r)}><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {p.is_ai && <span className="absolute bottom-0 left-0 text-[10px] bg-background/80 px-1 rounded">AI</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Upravit trasu" : "Nová trasa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>GPX soubor {editing && "(jen pro výměnu)"}</Label>
              <Input type="file" accept=".gpx" onChange={(e) => onGpx(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Název</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Adresa (slug)</Label><Input value={form.slug} placeholder={slugify(form.title)} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
            <div><Label>Popis</Label><Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>km</Label><Input type="number" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: +e.target.value })} /></div>
              <div><Label>Převýšení</Label><Input type="number" value={form.elevation_m} onChange={(e) => setForm({ ...form, elevation_m: +e.target.value })} /></div>
              <div><Label>Den</Label><Input type="number" value={form.camp_day} onChange={(e) => setForm({ ...form, camp_day: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Obtížnost</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DIFFICULTY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Terén</Label>
                <Select value={form.terrain} onValueChange={(v) => setForm({ ...form, terrain: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TERRAIN_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div><Label>Odkaz Mapy.cz</Label><Input value={form.mapy_url} onChange={(e) => setForm({ ...form, mapy_url: e.target.value })} /></div>
            <div className="flex items-center justify-between">
              <div><Label>Pořadí</Label><Input type="number" className="w-24" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />Zveřejněno</label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CampRoutesAdmin;
