import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save, Target } from "lucide-react";
import { toast } from "sonner";

interface ChallengeSettings {
  id: string;
  year: number;
  target_under_40: number;
  target_under_60: number;
  target_over_60: number;
  club_total_target: number;
}

const ChallengeAdmin = () => {
  const [settings, setSettings] = useState<ChallengeSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, ChallengeSettings>>({});

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("yearly_challenge_settings")
        .select("*")
        .order("year", { ascending: true });

      if (error) throw error;
      
      // Cast the data since Supabase types might not be updated yet
      const typedData = (data || []) as ChallengeSettings[];
      setSettings(typedData);
      
      // Initialize edited settings with current values
      const edited: Record<string, ChallengeSettings> = {};
      typedData.forEach((s) => {
        edited[s.id] = { ...s };
      });
      setEditedSettings(edited);
    } catch (error) {
      console.error("Error fetching challenge settings:", error);
      toast.error("Nepodařilo se načíst nastavení výzvy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (
    id: string,
    field: keyof ChallengeSettings,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setEditedSettings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: numValue,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const setting of Object.values(editedSettings)) {
        const { error } = await supabase
          .from("yearly_challenge_settings")
          .update({
            target_under_40: setting.target_under_40,
            target_under_60: setting.target_under_60,
            target_over_60: setting.target_over_60,
            club_total_target: setting.club_total_target,
          })
          .eq("id", setting.id);

        if (error) throw error;
      }

      toast.success("Nastavení výzvy bylo uloženo");
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving challenge settings:", error);
      toast.error(error.message || "Nepodařilo se uložit nastavení");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return settings.some((s) => {
      const edited = editedSettings[s.id];
      if (!edited) return false;
      return (
        s.target_under_40 !== edited.target_under_40 ||
        s.target_under_60 !== edited.target_under_60 ||
        s.target_over_60 !== edited.target_over_60 ||
        s.club_total_target !== edited.club_total_target
      );
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Nastavení Výzvy roku
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground">
          <p>Nastavte cílové kilometry pro jednotlivé věkové kategorie a celkový cíl klubu pro každý rok.</p>
          <p className="mt-1">Věkové kategorie: <strong>Pod 40 let</strong>, <strong>40-60 let</strong>, <strong>Nad 60 let</strong></p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Rok</TableHead>
                <TableHead>
                  <div className="flex flex-col">
                    <span>Pod 40 let</span>
                    <span className="text-xs font-normal text-muted-foreground">km/rok</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex flex-col">
                    <span>40-60 let</span>
                    <span className="text-xs font-normal text-muted-foreground">km/rok</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex flex-col">
                    <span>Nad 60 let</span>
                    <span className="text-xs font-normal text-muted-foreground">km/rok</span>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex flex-col">
                    <span>Klub celkem</span>
                    <span className="text-xs font-normal text-muted-foreground">km/rok</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-medium">{setting.year}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editedSettings[setting.id]?.target_under_40 || 0}
                      onChange={(e) =>
                        handleChange(setting.id, "target_under_40", e.target.value)
                      }
                      className="w-24"
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editedSettings[setting.id]?.target_under_60 || 0}
                      onChange={(e) =>
                        handleChange(setting.id, "target_under_60", e.target.value)
                      }
                      className="w-24"
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editedSettings[setting.id]?.target_over_60 || 0}
                      onChange={(e) =>
                        handleChange(setting.id, "target_over_60", e.target.value)
                      }
                      className="w-24"
                      min={0}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editedSettings[setting.id]?.club_total_target || 0}
                      onChange={(e) =>
                        handleChange(setting.id, "club_total_target", e.target.value)
                      }
                      className="w-28"
                      min={0}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !hasChanges()}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Uložit změny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeAdmin;
