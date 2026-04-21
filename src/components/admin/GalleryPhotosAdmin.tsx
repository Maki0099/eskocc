import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { SortableGalleryPhotoItem, type AdminPhoto } from "./SortableGalleryPhotoItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type FilterType = "all" | "events" | "general";

const GalleryPhotosAdmin = () => {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select(`
          id, file_url, file_name, caption, created_at, user_id, event_id, sort_order,
          profile:profiles(full_name),
          event:events(title)
        `)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos((data || []) as unknown as AdminPhoto[]);
    } catch (err: any) {
      console.error(err);
      toast.error("Nepodařilo se načíst fotky");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(photos, oldIndex, newIndex);
    // Reassign sort_order sequentially across all photos
    const withOrder = reordered.map((p, idx) => ({ ...p, sort_order: idx }));
    setPhotos(withOrder);

    try {
      // Determine the affected range only (between min and max of old/new)
      const start = Math.min(oldIndex, newIndex);
      const end = Math.max(oldIndex, newIndex);
      const updates = withOrder.slice(start, end + 1).map((p) =>
        supabase.from("gallery_items").update({ sort_order: p.sort_order }).eq("id", p.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success("Pořadí uloženo");
    } catch (err: any) {
      console.error(err);
      toast.error("Nepodařilo se uložit pořadí");
      fetchPhotos();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const photo = photos.find((p) => p.id === deleteId);
    try {
      // Try to remove from storage (extract path after /gallery/)
      if (photo?.file_url) {
        const match = photo.file_url.match(/\/gallery\/(.+)$/);
        if (match?.[1]) {
          await supabase.storage.from("gallery").remove([match[1]]);
        }
      }
      const { error } = await supabase.from("gallery_items").delete().eq("id", deleteId);
      if (error) throw error;
      setPhotos((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Fotka smazána");
    } catch (err: any) {
      console.error(err);
      toast.error("Nepodařilo se smazat fotku");
    } finally {
      setDeleteId(null);
    }
  };

  const visiblePhotos = photos.filter((p) => {
    if (filter === "all") return true;
    if (filter === "events") return !!p.event_id;
    return !p.event_id;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Fotky v galerii
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag-and-drop pro řazení. Pořadí je globální napříč všemi fotkami — filtr je jen pro zobrazení.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">Všechny ({photos.length})</TabsTrigger>
            <TabsTrigger value="events">
              Z vyjížděk ({photos.filter((p) => p.event_id).length})
            </TabsTrigger>
            <TabsTrigger value="general">
              Ostatní ({photos.filter((p) => !p.event_id).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : visiblePhotos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Žádné fotky</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={visiblePhotos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {visiblePhotos.map((photo) => (
                  <SortableGalleryPhotoItem
                    key={photo.id}
                    photo={photo}
                    onDelete={(id) => setDeleteId(id)}
                    isDragActive={!!activeDragId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat fotku?</AlertDialogTitle>
              <AlertDialogDescription>
                Tuto akci nelze vrátit zpět. Fotka bude trvale odstraněna z galerie i úložiště.
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

export default GalleryPhotosAdmin;
