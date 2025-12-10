import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Static cafe photos from assets
import cafeInterior1 from "@/assets/cafe/cafe-interior-1.jpg";
import cafeInterior2 from "@/assets/cafe/cafe-interior-2.jpeg";
import cafeInterior3 from "@/assets/cafe/cafe-interior-3.jpeg";
import cafeTerrace from "@/assets/cafe/cafe-terrace.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Coffee, Plus, Loader2, Image, Upload, FolderTree, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MenuItemsHierarchy } from "./MenuItemsHierarchy";

interface OpeningHour {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

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

interface GalleryPhoto {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
  sort_order: number;
}

const dayNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

interface SystemPhoto {
  src: string;
  name: string;
  caption: string;
}

const systemPhotos: SystemPhoto[] = [
  { src: cafeInterior1, name: "cafe-interior-1.jpg", caption: "Interiér kavárny" },
  { src: cafeInterior2, name: "cafe-interior-2.jpeg", caption: "Interiér 2" },
  { src: cafeInterior3, name: "cafe-interior-3.jpeg", caption: "Interiér 3" },
  { src: cafeTerrace, name: "cafe-terrace.jpg", caption: "Terasa" },
];

const CafeAdmin = () => {
  const { user } = useAuth();
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [migrating, setMigrating] = useState<string | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    category_id: "",
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    parent_id: "",
  });

  const scrollPositionRef = useRef<number>(0);
  const shouldRestoreScrollRef = useRef<boolean>(false);

  // Restore scroll position after state updates complete
  useEffect(() => {
    if (shouldRestoreScrollRef.current && !loading) {
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
        shouldRestoreScrollRef.current = false;
      }, 50);
    }
  }, [menuItems, categories, loading]);

  // Save scroll position when opening dialogs
  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
    shouldRestoreScrollRef.current = true;
  };

  const fetchData = async () => {
    try {
      const [hoursRes, menuRes, categoriesRes, galleryRes] = await Promise.all([
        supabase.from("cafe_opening_hours").select("*").order("day_of_week"),
        supabase.from("cafe_menu_items").select("*").order("sort_order"),
        supabase.from("cafe_menu_categories").select("*").order("sort_order"),
        supabase.from("cafe_gallery").select("*").order("sort_order"),
      ]);

      if (hoursRes.error) throw hoursRes.error;
      if (menuRes.error) throw menuRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (galleryRes.error) throw galleryRes.error;

      setOpeningHours(hoursRes.data || []);
      setMenuItems(menuRes.data || []);
      setCategories(categoriesRes.data || []);
      setGalleryPhotos(galleryRes.data || []);
    } catch (error) {
      console.error("Error fetching cafe data:", error);
      toast.error("Nepodařilo se načíst data kavárny");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHourChange = async (
    hourId: string,
    field: "is_closed" | "open_time" | "close_time",
    value: boolean | string
  ) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("cafe_opening_hours")
        .update({ [field]: value })
        .eq("id", hourId);

      if (error) throw error;
      
      setOpeningHours((prev) =>
        prev.map((h) => (h.id === hourId ? { ...h, [field]: value } : h))
      );
      toast.success("Uloženo");
    } catch (error) {
      console.error("Error updating hours:", error);
      toast.error("Nepodařilo se uložit změny");
    } finally {
      setSaving(false);
    }
  };

  // Category handlers
  const openCategoryDialog = (category?: MenuCategory) => {
    saveScrollPosition();
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        parent_id: category.parent_id || "",
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", parent_id: "" });
    }
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: categoryForm.name,
        parent_id: categoryForm.parent_id || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("cafe_menu_categories")
          .update(data)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast.success("Kategorie upravena");
      } else {
        const { error } = await supabase.from("cafe_menu_categories").insert(data);
        if (error) throw error;
        toast.success("Kategorie přidána");
      }

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Nepodařilo se uložit kategorii");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Opravdu chcete smazat tuto kategorii? Položky menu zůstanou zachovány.")) return;
    saveScrollPosition();

    try {
      const { error } = await supabase.from("cafe_menu_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Kategorie smazána");
      fetchData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Nepodařilo se smazat kategorii");
    }
  };

  const openMenuDialog = (item?: MenuItem) => {
    saveScrollPosition();
    if (item) {
      setEditingItem(item);
      setMenuForm({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        category: item.category,
        category_id: item.category_id || "",
      });
    } else {
      setEditingItem(null);
      setMenuForm({ name: "", description: "", price: "", category: "", category_id: "" });
    }
    setMenuDialogOpen(true);
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Find category name from category_id if selected
      const selectedCategory = categories.find(c => c.id === menuForm.category_id);
      const categoryName = selectedCategory ? selectedCategory.name : menuForm.category;

      const data = {
        name: menuForm.name,
        description: menuForm.description || null,
        price: parseFloat(menuForm.price),
        category: categoryName,
        category_id: menuForm.category_id || null,
        is_available: editingItem ? editingItem.is_available : true,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("cafe_menu_items")
          .update(data)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Položka upravena");
      } else {
        const { error } = await supabase.from("cafe_menu_items").insert(data);
        if (error) throw error;
        toast.success("Položka přidána");
      }

      setMenuDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Nepodařilo se uložit položku");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Opravdu chcete smazat tuto položku?")) return;
    saveScrollPosition();

    try {
      const { error } = await supabase.from("cafe_menu_items").delete().eq("id", id);
      if (error) throw error;
      toast.success("Položka smazána");
      fetchData();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Nepodařilo se smazat položku");
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    saveScrollPosition();
    try {
      const { error } = await supabase
        .from("cafe_menu_items")
        .update({ is_available: !item.is_available })
        .eq("id", item.id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("Nepodařilo se změnit dostupnost");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `cafe/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("gallery")
          .getPublicUrl(fileName);

        // Insert into cafe_gallery table
        const { error: insertError } = await supabase.from("cafe_gallery").insert({
          file_url: urlData.publicUrl,
          file_name: file.name,
          sort_order: galleryPhotos.length,
        });

        if (insertError) throw insertError;
      }

      toast.success("Fotky nahrány");
      fetchData();
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Nepodařilo se nahrát fotky");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photo: GalleryPhoto) => {
    if (!confirm("Opravdu chcete smazat tuto fotku?")) return;

    try {
      // Extract file path from URL
      const urlParts = photo.file_url.split("/gallery/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("gallery").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase.from("cafe_gallery").delete().eq("id", photo.id);
      if (error) throw error;

      toast.success("Fotka smazána");
      fetchData();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Nepodařilo se smazat fotku");
    }
  };

  // Migrate system photo to database
  const migrateSystemPhoto = async (photo: SystemPhoto) => {
    setMigrating(photo.name);
    try {
      // Fetch the static image as blob
      const response = await fetch(photo.src);
      const blob = await response.blob();

      // Generate unique filename
      const fileExt = photo.name.split(".").pop();
      const fileName = `cafe/${Date.now()}-${photo.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      // Insert into cafe_gallery table
      const { error: insertError } = await supabase.from("cafe_gallery").insert({
        file_url: urlData.publicUrl,
        file_name: photo.name,
        caption: photo.caption,
        sort_order: galleryPhotos.length,
      });

      if (insertError) throw insertError;

      toast.success(`Fotka "${photo.caption}" přidána do galerie`);
      fetchData();
    } catch (error) {
      console.error("Error migrating system photo:", error);
      toast.error("Nepodařilo se přidat fotku do galerie");
    } finally {
      setMigrating(null);
    }
  };

  // Filter out system photos already in database
  const availableSystemPhotos = systemPhotos.filter(
    (sp) => !galleryPhotos.some((gp) => gp.file_name === sp.name)
  );


  const orderedHours = [...openingHours].sort((a, b) => {
    const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
    const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
    return orderA - orderB;
  });

  // Get parent categories (those without parent_id)
  const parentCategories = categories.filter(c => !c.parent_id);
  
  // Get category display name with parent
  const getCategoryDisplayName = (category: MenuCategory) => {
    if (category.parent_id) {
      const parent = categories.find(c => c.id === category.parent_id);
      return parent ? `${parent.name} → ${category.name}` : category.name;
    }
    return category.name;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Opening Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Otevírací doba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderedHours.map((hour) => (
              <div key={hour.id} className="flex flex-wrap items-center gap-4 py-2 border-b border-border/50 last:border-0">
                <span className="font-medium w-24">{dayNames[hour.day_of_week]}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hour.is_closed}
                    onCheckedChange={(checked) => handleHourChange(hour.id, "is_closed", checked)}
                    disabled={saving}
                  />
                  <Label className="text-sm">Zavřeno</Label>
                </div>
                {!hour.is_closed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hour.open_time?.slice(0, 5) || ""}
                      onChange={(e) => handleHourChange(hour.id, "open_time", e.target.value)}
                      className="w-28"
                      disabled={saving}
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      value={hour.close_time?.slice(0, 5) || ""}
                      onChange={(e) => handleHourChange(hour.id, "close_time", e.target.value)}
                      className="w-28"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Menu Items - Hierarchical View */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            Nápojový lístek
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => openCategoryDialog()}>
                  <FolderTree className="w-4 h-4 mr-2" />
                  Přidat kategorii
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Upravit kategorii" : "Nová kategorie"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? "Upravte název nebo nadřazenou kategorii" : "Vytvořte novou kategorii pro menu"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Název kategorie</Label>
                    <Input
                      id="cat-name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="např. Káva, Čaj, Míchané nápoje..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent">Nadřazená kategorie (volitelné)</Label>
                    <Select
                      value={categoryForm.parent_id}
                      onValueChange={(value) => setCategoryForm({ ...categoryForm, parent_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Bez nadřazené kategorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Bez nadřazené kategorie</SelectItem>
                        {parentCategories
                          .filter(c => c.id !== editingCategory?.id)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                      Zrušit
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingCategory ? "Uložit" : "Přidat"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => openMenuDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat položku
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Upravit položku" : "Nová položka"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem ? "Upravte detaily položky menu" : "Přidejte novou položku do menu"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleMenuSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Název</Label>
                    <Input
                      id="name"
                      value={menuForm.name}
                      onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Popis (volitelné)</Label>
                    <Input
                      id="description"
                      value={menuForm.description}
                      onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Cena (Kč)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="1"
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_select">Kategorie</Label>
                    {categories.length > 0 ? (
                      <Select
                        value={menuForm.category_id}
                        onValueChange={(value) => {
                          const cat = categories.find(c => c.id === value);
                          setMenuForm({ 
                            ...menuForm, 
                            category_id: value === "custom" ? "" : value,
                            category: cat ? cat.name : menuForm.category
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte kategorii" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Vlastní kategorie</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {getCategoryDisplayName(cat)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {(!menuForm.category_id || categories.length === 0) && (
                      <Input
                        id="category"
                        value={menuForm.category}
                        onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                        placeholder="např. Káva Vergnano, Čaj, Matcha..."
                        required={!menuForm.category_id}
                        className={categories.length > 0 ? "mt-2" : ""}
                      />
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setMenuDialogOpen(false)}>
                      Zrušit
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingItem ? "Uložit" : "Přidat"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Přetažením kategorií a položek změníte jejich pořadí. Kliknutím na kategorii zobrazíte její položky.
          </p>
          <MenuItemsHierarchy
            categories={categories}
            menuItems={menuItems}
            onEditCategory={openCategoryDialog}
            onDeleteCategory={handleDeleteCategory}
            onEditItem={openMenuDialog}
            onDeleteItem={handleDeleteMenuItem}
            onToggleItemAvailability={toggleItemAvailability}
            onDataChange={fetchData}
          />
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Fotogalerie
          </CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Nahrát fotky
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* System photos section */}
          {availableSystemPhotos.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Systémové fotky (nepřidané do galerie)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {availableSystemPhotos.map((photo) => (
                  <div key={photo.name} className="relative group aspect-square">
                    <img
                      src={photo.src}
                      alt={photo.caption}
                      className="w-full h-full object-cover rounded-lg opacity-75"
                    />
                    <div className="absolute inset-0 flex items-end p-2">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => migrateSystemPhoto(photo)}
                        disabled={migrating === photo.name}
                      >
                        {migrating === photo.name ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Přidat do galerie
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing gallery photos */}
          {galleryPhotos.length === 0 && availableSystemPhotos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Žádné fotky v galerii
            </p>
          ) : galleryPhotos.length > 0 && (
            <>
              {availableSystemPhotos.length > 0 && (
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Fotky v galerii
                </h4>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryPhotos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square">
                    <img
                      src={photo.file_url}
                      alt={photo.caption || photo.file_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeletePhoto(photo)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeAdmin;
