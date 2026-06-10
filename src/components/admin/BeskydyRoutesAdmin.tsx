import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, Upload, MapPin,
} from "lucide-react";
import {
  BESKYDY_GPX_BUCKET,
  type BeskydyRouteRow,
  gpxStoragePathFor,
  resolveGpxUrl,
  slugify,
} from "@/lib/beskydy-routes";
import { parseGpxMetadata } from "@/lib/gpx-utils";

const TERRAIN_OPTIONS = [
  { value: "road", label: "Silnice" },
  { value: "gravel", label: "Gravel" },
  { value: "mtb", label: "MTB" },
];
const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Lehká" },
  { value: "medium", label: "Střední" },
  { value: "hard", label: "Náročná" },
];

interface FormState {
  slug: string;
  title: string;
  start_location: string;
  distance_km: number;
  elevation_m: number;
  terrain: string;
  difficulty: string;
  description: string;
  mapy_url: string;
  komoot_url: string;
  is_published: boolean;
}

const emptyForm: FormState = {
  slug: "",
  title: "",
  start_location: "",
  distance_km: 0,
  elevation_m: 0,
  terrain: "road",
  difficulty: "medium",
  description: "",
  mapy_url: "",
  komoot_url: "",
  is_published: true,
};

export const BeskydyRoutesAdmin = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BeskydyRouteRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BeskydyRouteRow | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-beskydy-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beskydy_routes")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BeskydyRouteRow[];
    },
  });

  const openCreate = () => {
    setEditingRow(null);
    setForm({ ...emptyForm, is_published: true });
    setSlugTouched(false);
    setGpxFile(null);
    setDialogOpen(true);
  };

  const openEdit = (row: BeskydyRouteRow) => {
    setEditingRow(row);
    setForm({
      slug: row.slug,
      title: row.title,
      start_location: row.start_location,
      distance_km: row.distance_km,
      elevation_m: row.elevation_m,
      terrain: row.terrain,
      difficulty: row.difficulty,
      description: row.description,
      mapy_url: row.mapy_url ?? "",
      komoot_url: row.komoot_url ?? "",
      is_published: row.is_published,
    });
    setSlugTouched(true);
    setGpxFile(null);
    setDialogOpen(true);
  };

  // auto-slug from title in create mode
  useEffect(() => {
    if (!dialogOpen) return;
    if (editingRow) return;
    if (slugTouched) return;
    setForm((f) => ({ ...f, slug: slugify(f.title) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, dialogOpen, editingRow, slugTouched]);

  const handleGpxFile = async (file: File | null) => {
    setGpxFile(file);
    if (!file) return;
    setParsing(true);
    try {
      const meta = await parseGpxMetadata(file);
      if (meta) {
        setForm((f) => ({
          ...f,
          distance_km: Math.round(meta.distanceKm),
          elevation_m: Math.round(meta.elevationM),
        }));
        toast.success(`GPX zparsován: ${Math.round(meta.distanceKm)} km, ${Math.round(meta.elevationM)} m ↑`);
      } else {
        toast.error("GPX se nepodařilo zparsovat — zadej hodnoty ručně");
      }
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Název a slug jsou povinné");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      toast.error("Slug může obsahovat jen malá písmena, číslice a pomlčky");
      return;
    }
    if (!editingRow && !gpxFile) {
      toast.error("Při vytváření je GPX soubor povinný");
      return;
    }

    setSaving(true);
    try {
      let gpx_path = editingRow?.gpx_path ?? "";
      if (gpxFile) {
        const path = gpxStoragePathFor(form.slug);
        const { error: upErr } = await supabase.storage
          .from(BESKYDY_GPX_BUCKET)
          .upload(path, gpxFile, {
            upsert: true,
            contentType: "application/gpx+xml",
            cacheControl: "3600",
          });
        if (upErr) throw upErr;
        gpx_path = path;
      }

      const payload = {
        slug: form.slug,
        title: form.title,
        start_location: form.start_location,
        distance_km: Math.round(Number(form.distance_km) || 0),
        elevation_m: Math.round(Number(form.elevation_m) || 0),
        terrain: form.terrain,
        difficulty: form.difficulty,
        description: form.description,
        mapy_url: form.mapy_url.trim() || null,
        komoot_url: form.komoot_url.trim() || null,
        is_published: form.is_published,
        gpx_path,
      };

      if (editingRow) {
        const { error } = await supabase
          .from("beskydy_routes")
          .update(payload)
          .eq("id", editingRow.id);
        if (error) throw error;
        toast.success("Trasa upravena");
      } else {
        const nextOrder = (rows?.length ?? 0) * 10 + 10;
        const { error } = await supabase
          .from("beskydy_routes")
          .insert({ ...payload, sort_order: nextOrder });
        if (error) throw error;
        toast.success("Trasa vytvořena");
      }

      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-beskydy-routes"] });
      qc.invalidateQueries({ queryKey: ["beskydy-routes"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Neznámá chyba";
      toast.error(`Uložení selhalo: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Best-effort storage cleanup (only if path is in our bucket)
      if (deleteTarget.gpx_path && !deleteTarget.gpx_path.startsWith("/") && !deleteTarget.gpx_path.startsWith("http")) {
        await supabase.storage.from(BESKYDY_GPX_BUCKET).remove([deleteTarget.gpx_path]);
      }
      const { error } = await supabase.from("beskydy_routes").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Trasa smazána");
      qc.invalidateQueries({ queryKey: ["admin-beskydy-routes"] });
      qc.invalidateQueries({ queryKey: ["beskydy-routes"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Neznámá chyba";
      toast.error(`Smazání selhalo: ${msg}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const move = async (row: BeskydyRouteRow, dir: -1 | 1) => {
    if (!rows) return;
    const idx = rows.findIndex((r) => r.id === row.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        supabase.from("beskydy_routes").update({ sort_order: swap.sort_order }).eq("id", row.id),
        supabase.from("beskydy_routes").update({ sort_order: row.sort_order }).eq("id", swap.id),
      ]);
      qc.invalidateQueries({ queryKey: ["admin-beskydy-routes"] });
      qc.invalidateQueries({ queryKey: ["beskydy-routes"] });
    } catch {
      toast.error("Přesun se nepodařil");
    }
  };

  const togglePublished = async (row: BeskydyRouteRow) => {
    await supabase.from("beskydy_routes").update({ is_published: !row.is_published }).eq("id", row.id);
    qc.invalidateQueries({ queryKey: ["admin-beskydy-routes"] });
    qc.invalidateQueries({ queryKey: ["beskydy-routes"] });
  };

  const currentGpxPreviewUrl = useMemo(() => {
    if (gpxFile) return URL.createObjectURL(gpxFile);
    if (editingRow) return resolveGpxUrl(editingRow.gpx_path, editingRow.updated_at);
    return null;
  }, [gpxFile, editingRow]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Beskydské trasy
            </h2>
            <p className="text-sm text-muted-foreground">
              Spravuje obsah stránky <code>/pruvodce-beskydy</code>.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Přidat trasu
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Trasa</TableHead>
                  <TableHead className="text-right">km</TableHead>
                  <TableHead className="text-right">m ↑</TableHead>
                  <TableHead>Terén</TableHead>
                  <TableHead>Obtížnost</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((r, idx) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.slug}</div>
                    </TableCell>
                    <TableCell className="text-right">{r.distance_km}</TableCell>
                    <TableCell className="text-right">{r.elevation_m}</TableCell>
                    <TableCell>{TERRAIN_OPTIONS.find(t => t.value === r.terrain)?.label ?? r.terrain}</TableCell>
                    <TableCell>{DIFFICULTY_OPTIONS.find(t => t.value === r.difficulty)?.label ?? r.difficulty}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_published ? "default" : "secondary"}>
                        {r.is_published ? "Publikováno" : "Skryto"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => move(r, -1)} disabled={idx === 0} title="Nahoru">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => move(r, 1)} disabled={idx === (rows?.length ?? 0) - 1} title="Dolů">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => togglePublished(r)} title={r.is_published ? "Skrýt" : "Publikovat"}>
                          {r.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Upravit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(r)} title="Smazat">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(rows?.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Zatím žádné trasy.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Upravit trasu" : "Nová trasa"}</DialogTitle>
            <DialogDescription>
              Po uložení se změny projeví na stránce <code>/pruvodce-beskydy</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Název *</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }}
                placeholder="napr-trasa-okruh"
              />
              <p className="text-xs text-muted-foreground">Použije se v názvu souboru a interně. Jen malá písmena, číslice a pomlčky.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" value={form.start_location} onChange={(e) => setForm({ ...form, start_location: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gpx">GPX soubor {editingRow ? "(volitelné — nahradí stávající)" : "*"}</Label>
              <Input
                id="gpx"
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                onChange={(e) => handleGpxFile(e.target.files?.[0] ?? null)}
              />
              {parsing && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Parsuji GPX…</p>}
              {currentGpxPreviewUrl && (
                <p className="text-xs text-muted-foreground">
                  Aktuální GPX: <a className="text-primary hover:underline" href={currentGpxPreviewUrl} target="_blank" rel="noopener noreferrer">otevřít</a>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="dist">Vzdálenost (km)</Label>
                <Input id="dist" type="number" inputMode="numeric" value={form.distance_km}
                  onChange={(e) => setForm({ ...form, distance_km: Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="elev">Převýšení (m)</Label>
                <Input id="elev" type="number" inputMode="numeric" value={form.elevation_m}
                  onChange={(e) => setForm({ ...form, elevation_m: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Terén</Label>
                <Select value={form.terrain} onValueChange={(v) => setForm({ ...form, terrain: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TERRAIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Obtížnost</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Popis</Label>
              <Textarea id="desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mapy">Mapy.cz URL</Label>
              <Input id="mapy" value={form.mapy_url} onChange={(e) => setForm({ ...form, mapy_url: e.target.value })} placeholder="https://mapy.cz/..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="komoot">Komoot URL</Label>
              <Input id="komoot" value={form.komoot_url} onChange={(e) => setForm({ ...form, komoot_url: e.target.value })} placeholder="https://www.komoot.com/..." />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="pub">Publikováno</Label>
                <p className="text-xs text-muted-foreground">Pokud vypneš, trasa se na veřejné stránce nezobrazí.</p>
              </div>
              <Switch id="pub" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Zrušit</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {editingRow ? "Uložit" : "Vytvořit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trasu?</AlertDialogTitle>
            <AlertDialogDescription>
              Smaže trasu „{deleteTarget?.title}" včetně přidruženého GPX souboru. Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BeskydyRoutesAdmin;
