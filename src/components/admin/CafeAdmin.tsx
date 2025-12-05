import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Coffee, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  is_available: boolean;
  sort_order: number;
}

const dayNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

const CafeAdmin = () => {
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    sort_order: "0",
  });

  const fetchData = async () => {
    try {
      const [hoursRes, menuRes] = await Promise.all([
        supabase.from("cafe_opening_hours").select("*").order("day_of_week"),
        supabase.from("cafe_menu_items").select("*").order("sort_order"),
      ]);

      if (hoursRes.error) throw hoursRes.error;
      if (menuRes.error) throw menuRes.error;

      setOpeningHours(hoursRes.data || []);
      setMenuItems(menuRes.data || []);
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

  const openMenuDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setMenuForm({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        category: item.category,
        sort_order: item.sort_order.toString(),
      });
    } else {
      setEditingItem(null);
      setMenuForm({ name: "", description: "", price: "", category: "", sort_order: "0" });
    }
    setMenuDialogOpen(true);
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: menuForm.name,
        description: menuForm.description || null,
        price: parseFloat(menuForm.price),
        category: menuForm.category,
        sort_order: parseInt(menuForm.sort_order),
        is_available: true,
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

  // Reorder hours to start with Monday
  const orderedHours = [...openingHours].sort((a, b) => {
    const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
    const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
    return orderA - orderB;
  });

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

      {/* Menu Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Coffee className="w-5 h-5" />
            Nápojový lístek
          </CardTitle>
          <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openMenuDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Přidat položku
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Upravit položku" : "Nová položka"}
                </DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="sort_order">Pořadí</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={menuForm.sort_order}
                      onChange={(e) => setMenuForm({ ...menuForm, sort_order: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategorie</Label>
                  <Input
                    id="category"
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    placeholder="např. Káva Vergnano, Čaj, Matcha..."
                    required
                  />
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
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Cena</TableHead>
                  <TableHead>Dostupné</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id} className={!item.is_available ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell>{item.price} Kč</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => toggleItemAvailability(item)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openMenuDialog(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMenuItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeAdmin;