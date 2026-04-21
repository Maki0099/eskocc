import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExternalAlbums, type ExternalAlbum } from "@/hooks/useExternalAlbums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ImagePlus, Pencil, Trash2, Loader2, Plus, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  title: "",
  url: "",
  year: "" as string,
  cover_image_url: "" as string | null,
};

const ExternalAlbumsAdmin = () => {
  const { albums, loading, refetch } = useExternalAlbums();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExternalAlbum | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (album: ExternalAlbum) => {
    setEditing(album);
    setForm({
      title: album.title,
      url: album.url,
      year: album.year?.toString() ?? "",
      cover_image_url: album.cover_image_url,
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("album-covers")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("album-covers").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
      toast.success("Obrázek nahrán");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Nahrání selhalo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error("Název a URL jsou povinné");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        url: form.url.trim(),
        cover_image_url: form.cover_image_url || null,
        year: form.year ? parseInt(form.year, 10) : null,
      };

      if (editing) {
        const { error } = await supabase
          .from("external_albums")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Album upraveno");
      } else {
        const maxOrder = albums.reduce((m, a) => Math.max(m, a.sort_order), -1);
        const { error } = await supabase.from("external_albums").insert({
          ...payload,
          sort_order: maxOrder + 1,
        });
        if (error) throw error;
        toast.success("Album přidáno");
      }
      setDialogOpen(false);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Uložení selhalo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("external_albums").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Album smazáno");
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Smazání selhalo");
    } finally {
      setDeleteId(null);
    }
  };

  const move = async (album: ExternalAlbum, direction: -1 | 1) => {
    const idx = albums.findIndex((a) => a.id === album.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= albums.length) return;
    const other = albums[swapIdx];
    try {
      // Swap via two-step update to avoid unique-constraint issues (none here, but safe)
      await supabase.from("external_albums").update({ sort_order: -1 }).eq("id", album.id);
      await supabase.from("external_albums").update({ sort_order: album.sort_order }).eq("id", other.id);
      await supabase.from("external_albums").update({ sort_order: other.sort_order }).eq("id", album.id);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error("Přesun selhal");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="w-5 h-5" />
          Externí alba (Google Photos)
        </CardTitle>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Přidat album
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : albums.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Žádná alba</p>
        ) : (
          <div className="space-y-2">
            {albums.map((album, i) => (
              <div
                key={album.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {album.cover_image_url ? (
                    <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{album.title}</div>
                  <a
                    href={album.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground truncate hover:text-primary inline-flex items-center gap-1"
                  >
                    {album.url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => move(album, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === albums.length - 1} onClick={() => move(album, 1)}>
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(album)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(album.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Upravit album" : "Nové album"}</DialogTitle>
              <DialogDescription>
                Sdílecí URL z Google Photos a cover obrázek (doporučeno 1600×900).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Název</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Mallorca 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL alba</Label>
                <Input
                  id="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://photos.app.goo.gl/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Rok (volitelné)</Label>
                <Input
                  id="year"
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover obrázek</Label>
                {form.cover_image_url && (
                  <img
                    src={form.cover_image_url}
                    alt="Náhled"
                    className="w-full aspect-video object-cover rounded border"
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {form.cover_image_url ? "Vyměnit obrázek" : "Nahrát obrázek"}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editing ? "Uložit" : "Přidat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat album?</AlertDialogTitle>
              <AlertDialogDescription>
                Tuto akci nelze vrátit zpět. Album bude odstraněno z galerie.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Smazat</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default ExternalAlbumsAdmin;
