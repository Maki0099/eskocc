import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
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
import { GripVertical } from "lucide-react";
import { SortableCategoryItem } from "./SortableCategoryItem";
import { SortableMenuItem } from "./SortableMenuItem";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  category_id: string | null;
  is_available: boolean;
  sort_order: number;
}

interface MenuCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
}

interface MenuItemsHierarchyProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (id: string) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleItemAvailability: (item: MenuItem) => void;
  onDataChange: () => void;
}

export const MenuItemsHierarchy = ({
  categories,
  menuItems,
  onEditCategory,
  onDeleteCategory,
  onEditItem,
  onDeleteItem,
  onToggleItemAvailability,
  onDataChange,
}: MenuItemsHierarchyProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [localCategories, setLocalCategories] = useState(categories);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<"category" | "subcategory" | "item" | null>(null);
  const [localMenuItems, setLocalMenuItems] = useState(menuItems);

  // Update local state when props change - proper useEffect hooks
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalMenuItems(menuItems);
  }, [menuItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get main categories (those without parent_id)
  const mainCategories = localCategories
    .filter((c) => !c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Get subcategories for a parent
  const getSubcategories = (parentId: string) =>
    localCategories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Get items for a category (including its subcategories)
  const getItemsForCategory = (categoryId: string) => {
    const subcatIds = getSubcategories(categoryId).map((c) => c.id);
    return localMenuItems
      .filter((item) => item.category_id === categoryId || subcatIds.includes(item.category_id || ""))
      .sort((a, b) => a.sort_order - b.sort_order);
  };

  // Get items directly under a subcategory
  const getItemsForSubcategory = (categoryId: string) =>
    localMenuItems
      .filter((item) => item.category_id === categoryId)
      .sort((a, b) => a.sort_order - b.sort_order);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCategoryDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setActiveDragType("category");
  };

  const handleSubcategoryDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setActiveDragType("subcategory");
  };

  const handleItemDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setActiveDragType("item");
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setActiveDragType(null);
  };

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    setActiveDragType(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = mainCategories.findIndex((c) => c.id === active.id);
    const newIndex = mainCategories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(mainCategories, oldIndex, newIndex);
    
    // Optimistic update
    const updatedCategories = localCategories.map((cat) => {
      const newOrder = reordered.findIndex((c) => c.id === cat.id);
      if (newOrder !== -1) {
        return { ...cat, sort_order: newOrder };
      }
      return cat;
    });
    setLocalCategories(updatedCategories);

    // Update database
    try {
      const updates = reordered.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("cafe_menu_categories")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      toast.success("Pořadí kategorií uloženo");
      onDataChange();
    } catch (error) {
      console.error("Error updating category order:", error);
      toast.error("Nepodařilo se uložit pořadí");
      setLocalCategories(categories);
    }
  };

  const handleSubcategoryDragEnd = async (event: DragEndEvent, parentId: string) => {
    setActiveDragId(null);
    setActiveDragType(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const subcategories = getSubcategories(parentId);
    const oldIndex = subcategories.findIndex((c) => c.id === active.id);
    const newIndex = subcategories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(subcategories, oldIndex, newIndex);

    // Optimistic update
    const updatedCategories = localCategories.map((cat) => {
      const newOrder = reordered.findIndex((c) => c.id === cat.id);
      if (newOrder !== -1) {
        return { ...cat, sort_order: newOrder };
      }
      return cat;
    });
    setLocalCategories(updatedCategories);

    // Update database
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from("cafe_menu_categories")
          .update({ sort_order: i })
          .eq("id", reordered[i].id);
      }

      toast.success("Pořadí podkategorií uloženo");
      onDataChange();
    } catch (error) {
      console.error("Error updating subcategory order:", error);
      toast.error("Nepodařilo se uložit pořadí");
      setLocalCategories(categories);
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent, categoryId: string) => {
    setActiveDragId(null);
    setActiveDragType(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = getItemsForSubcategory(categoryId);
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    const updatedItems = localMenuItems.map((item) => {
      const newOrder = reordered.findIndex((i) => i.id === item.id);
      if (newOrder !== -1) {
        return { ...item, sort_order: newOrder };
      }
      return item;
    });
    setLocalMenuItems(updatedItems);

    // Update database
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from("cafe_menu_items")
          .update({ sort_order: i })
          .eq("id", reordered[i].id);
      }

      toast.success("Pořadí položek uloženo");
      onDataChange();
    } catch (error) {
      console.error("Error updating item order:", error);
      toast.error("Nepodařilo se uložit pořadí");
      setLocalMenuItems(menuItems);
    }
  };

  // Items without category
  const uncategorizedItems = localMenuItems
    .filter((item) => !item.category_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      {/* Main categories with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleCategoryDragStart}
        onDragEnd={handleCategoryDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={mainCategories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`space-y-2 transition-all duration-200 ${activeDragType === "category" ? "rounded-lg ring-2 ring-primary/20 ring-offset-2 p-2 -m-2" : ""}`}>
            {mainCategories.map((mainCat) => {
              const subcategories = getSubcategories(mainCat.id);
              const directItems = getItemsForSubcategory(mainCat.id);
              const totalItems = getItemsForCategory(mainCat.id).length;

              return (
                <SortableCategoryItem
                  key={mainCat.id}
                  category={mainCat}
                  isExpanded={expandedCategories.has(mainCat.id)}
                  onToggleExpand={() => toggleExpand(mainCat.id)}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                  itemCount={totalItems}
                  isDragActive={activeDragType === "category"}
                >
                  {/* Subcategories */}
                  {subcategories.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleSubcategoryDragStart}
                      onDragEnd={(e) => handleSubcategoryDragEnd(e, mainCat.id)}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext
                        items={subcategories.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={`space-y-2 mb-3 transition-all duration-200 ${activeDragType === "subcategory" ? "rounded-lg ring-2 ring-primary/20 p-2 -m-2" : ""}`}>
                          {subcategories.map((subCat) => {
                            const subItems = getItemsForSubcategory(subCat.id);
                            return (
                              <SortableCategoryItem
                                key={subCat.id}
                                category={subCat}
                                isExpanded={expandedCategories.has(subCat.id)}
                                onToggleExpand={() => toggleExpand(subCat.id)}
                                onEdit={onEditCategory}
                                onDelete={onDeleteCategory}
                                itemCount={subItems.length}
                                isDragActive={activeDragType === "subcategory"}
                              >
                                {/* Items in subcategory */}
                                <DndContext
                                  sensors={sensors}
                                  collisionDetection={closestCenter}
                                  onDragStart={handleItemDragStart}
                                  onDragEnd={(e) => handleItemDragEnd(e, subCat.id)}
                                  onDragCancel={handleDragCancel}
                                >
                                  <SortableContext
                                    items={subItems.map((i) => i.id)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {subItems.length > 0 ? (
                                      <div className={`space-y-2 transition-all duration-200 ${activeDragType === "item" ? "rounded-lg ring-2 ring-primary/20 p-2 -m-2" : ""}`}>
                                        {subItems.map((item) => (
                                          <SortableMenuItem
                                            key={item.id}
                                            item={item}
                                            onEdit={onEditItem}
                                            onDelete={onDeleteItem}
                                            onToggleAvailability={onToggleItemAvailability}
                                            isDragActive={activeDragType === "item"}
                                          />
                                        ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground text-center py-2">
                                      Žádné položky
                                    </p>
                                  )}
                                </SortableContext>
                              </DndContext>
                            </SortableCategoryItem>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Direct items under main category (if no subcategories or some items are direct) */}
                {directItems.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleItemDragStart}
                    onDragEnd={(e) => handleItemDragEnd(e, mainCat.id)}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={directItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={`space-y-2 transition-all duration-200 ${activeDragType === "item" ? "rounded-lg ring-2 ring-primary/20 p-2 -m-2" : ""}`}>
                        {subcategories.length > 0 && (
                          <p className="text-xs text-muted-foreground font-medium mt-2">
                            Přímo v kategorii:
                          </p>
                        )}
                        {directItems.map((item) => (
                          <SortableMenuItem
                            key={item.id}
                            item={item}
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                            onToggleAvailability={onToggleItemAvailability}
                            isDragActive={activeDragType === "item"}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {subcategories.length === 0 && directItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Žádné položky v této kategorii
                  </p>
                )}
              </SortableCategoryItem>
            );
          })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Uncategorized items */}
      {uncategorizedItems.length > 0 && (
        <div className="border border-dashed border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Bez kategorie ({uncategorizedItems.length})
          </h4>
          <div className="space-y-2">
            {uncategorizedItems.map((item) => (
              <SortableMenuItem
                key={item.id}
                item={item}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
                onToggleAvailability={onToggleItemAvailability}
              />
            ))}
          </div>
        </div>
      )}

      {mainCategories.length === 0 && uncategorizedItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Zatím nejsou vytvořeny žádné kategorie ani položky
        </p>
      )}
    </div>
  );
};
