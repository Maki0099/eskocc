import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExternalAlbums, type ExternalAlbum } from "@/hooks/useExternalAlbums";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableAlbumItem } from "./SortableAlbumItem";
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
import { ImagePlus, Loader2, Plus } from "lucide-react";
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = albums.findIndex((a) => a.id === active.id);
    const newIndex = albums.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(albums, oldIndex, newIndex);

    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from("external_albums")
          .update({ sort_order: i })
          .eq("id", reordered[i].id);
      }
      toast.success("Pořadí uloženo");
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error("Přesun selhal");
      refetch();
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={albums.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div
                className={`space-y-2 transition-all duration-200 ${
                  activeDragId ? "rounded-lg ring-2 ring-primary/20 ring-offset-2 p-2 -m-2" : ""
                }`}
              >
                {albums.map((album) => (
                  <SortableAlbumItem
                    key={album.id}
                    album={album}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteId(id)}
                    isDragActive={!!activeDragId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Upravit album" : "Nové album"}</DialogTitle>
              <DialogDescription>
                Sdílecí URL z Google Photos a cover obrázek.
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
                <div className="flex items-baseline justify-between gap-2">
                  <Label>Cover obrázek</Label>
                  <span className="text-xs text-muted-foreground">
                    Doporučené rozlišení: <strong>1600×900</strong> (poměr 16:9)
                  </span>
                </div>
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
