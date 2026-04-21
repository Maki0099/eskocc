import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, ImagePlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExternalAlbum } from "@/hooks/useExternalAlbums";

interface SortableAlbumItemProps {
  album: ExternalAlbum;
  onEdit: (album: ExternalAlbum) => void;
  onDelete: (id: string) => void;
  isDragActive?: boolean;
}

export const SortableAlbumItem = ({
  album,
  onEdit,
  onDelete,
  isDragActive = false,
}: SortableAlbumItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: album.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card group transition-all duration-200 ${
        isDragging ? "opacity-50 shadow-lg z-50 scale-[1.02] border-primary" : ""
      } ${isOver && !isDragging ? "border-primary border-2 bg-primary/5" : "border-border"} ${
        isDragActive && !isDragging && !isOver ? "border-dashed" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </button>

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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(album)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(album.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
