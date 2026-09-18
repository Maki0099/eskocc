import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bike, Home } from "lucide-react";

interface RatioRow {
  category: string;
  km: number;
  rides: number;
  minutes: number;
}

const TrainerRatio = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<RatioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_trainer_ratio" as any, {
        _user_id: userId,
        _year: year,
      });
      if (!active) return;
      setRows((data as any as RatioRow[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [userId, year]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Venku vs trenažér</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const totalKm = rows.reduce((sum, r) => sum + Number(r.km || 0), 0);
  if (totalKm === 0 || rows.length < 2) return null;

  const outdoor = rows.find((r) => r.category === "Venku");
  const trainer = rows.find((r) => r.category === "Trenažér");
  const outdoorPct = totalKm > 0 ? ((outdoor?.km || 0) / totalKm) * 100 : 0;
  const trainerPct = totalKm > 0 ? ((trainer?.km || 0) / totalKm) * 100 : 0;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Venku vs trenažér</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-3 rounded-full bg-muted border border-border/60 overflow-hidden flex">
          <div
            className="h-full bg-primary"
            style={{ width: `${outdoorPct}%` }}
          />
          <div
            className="h-full bg-secondary"
            style={{ width: `${trainerPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <Bike className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Venku</span>
            </div>
            <p className="text-lg font-bold">{Number(outdoor?.km || 0).toLocaleString("cs-CZ")} km</p>
            <p className="text-xs text-muted-foreground">
              {outdoor?.rides || 0} jízd · {Math.round(outdoor?.minutes || 0)} min
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20">
            <div className="flex items-center gap-2 mb-1">
              <Home className="w-4 h-4 text-secondary-foreground" />
              <span className="text-sm font-medium">Trenažér</span>
            </div>
            <p className="text-lg font-bold">{Number(trainer?.km || 0).toLocaleString("cs-CZ")} km</p>
            <p className="text-xs text-muted-foreground">
              {trainer?.rides || 0} jízd · {Math.round(trainer?.minutes || 0)} min
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainerRatio;
