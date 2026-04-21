import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ImageIcon, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export interface AdminPhoto {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  event_id: string | null;
  sort_order: number;
  profile?: { full_name: string | null } | null;
  event?: { title: string } | null;
}

interface Props {
  photo: AdminPhoto;
  onDelete: (id: string) => void;
  isDragActive?: boolean;
}

export const SortableGalleryPhotoItem = ({ photo, onDelete, isDragActive = false }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: photo.id });

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

      <div className="w-20 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
        {photo.file_url ? (
          <img src={photo.file_url} alt={photo.caption ?? photo.file_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-medium truncate">
          {photo.caption || <span className="text-muted-foreground italic">Bez popisu</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {photo.profile?.full_name || "Neznámý"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(photo.created_at), "d. M. yyyy", { locale: cs })}
          </span>
          {photo.event?.title && (
            <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/70 truncate max-w-[200px]">
              {photo.event.title}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onDelete(photo.id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
