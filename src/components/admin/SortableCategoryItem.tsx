import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
}

interface SortableCategoryItemProps {
  category: MenuCategory;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (category: MenuCategory) => void;
  onDelete: (id: string) => void;
  itemCount: number;
  children?: React.ReactNode;
  isDragActive?: boolean;
}

export const SortableCategoryItem = ({
  category,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  itemCount,
  children,
  isDragActive = false,
}: SortableCategoryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? "opacity-50 shadow-lg z-50 scale-[1.02]" : ""} ${
        isOver && !isDragging ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 p-3 bg-muted/50 border rounded-lg transition-all duration-200 ${
          isExpanded ? "rounded-b-none border-b-0" : ""
        } ${isDragging ? "border-primary" : "border-border"} ${
          isOver && !isDragging ? "border-primary bg-primary/5" : ""
        } ${isDragActive && !isDragging && !isOver ? "border-dashed" : ""}`}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleExpand}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span className="font-medium">{category.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({itemCount} {itemCount === 1 ? "položka" : itemCount < 5 ? "položky" : "položek"})
          </span>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(category)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border border-t-0 border-border rounded-b-lg p-3 bg-background space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};
