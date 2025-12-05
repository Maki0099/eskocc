import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface Photo {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string | null;
  } | null;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoDeleted: () => void;
}

const PhotoGrid = ({ photos, onPhotoDeleted }: PhotoGridProps) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deletePhoto, setDeletePhoto] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const canDelete = (photo: Photo) => {
    return user && (photo.user_id === user.id || isAdmin);
  };

  const handleDelete = async () => {
    if (!deletePhoto) return;

    setDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = deletePhoto.file_url.split("/gallery/");
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage.from("gallery").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", deletePhoto.id);

      if (error) throw error;

      toast.success("Fotka byla smazána");
      setDeletePhoto(null);
      setSelectedIndex(null);
      onPhotoDeleted();
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      toast.error("Nepodařilo se smazat fotku");
    } finally {
      setDeleting(false);
    }
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Zatím žádné fotky
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg bg-muted"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={photo.file_url}
              alt={photo.caption || "Fotka z galerie"}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-5 h-5" />
            </Button>

            {selectedPhoto && canDelete(selectedPhoto) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 left-2 z-10 text-white hover:bg-red-500/20 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletePhoto(selectedPhoto);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}

            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

            {selectedIndex !== null && selectedIndex < photos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={goToNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}

            {selectedPhoto && (
              <div className="flex flex-col">
                <img
                  src={selectedPhoto.file_url}
                  alt={selectedPhoto.caption || "Fotka"}
                  className="max-h-[70vh] w-full object-contain"
                />
                <div className="p-4 text-white">
                  {selectedPhoto.caption && (
                    <p className="mb-2">{selectedPhoto.caption}</p>
                  )}
                  <p className="text-sm text-white/60">
                    {selectedPhoto.profile?.full_name || "Anonym"} •{" "}
                    {format(new Date(selectedPhoto.created_at), "d. MMMM yyyy", {
                      locale: cs,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletePhoto} onOpenChange={() => setDeletePhoto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat fotku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Fotka bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Mažu..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PhotoGrid;
