import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Gauge, Mountain, Route } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface Records {
  longest_km: number | null;
  longest_date: string | null;
  fastest_kmh: number | null;
  fastest_date: string | null;
  most_elevation: number | null;
  most_elevation_date: string | null;
}

const fmtDate = (d: string | null) =>
  d ? format(new Date(d), "d. M. yyyy", { locale: cs }) : "";

const MemberRecords = ({ userId }: { userId: string }) => {
  const [records, setRecords] = useState<Records | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_records" as any, { _user_id: userId });
      if (!active) return;
      const row = Array.isArray(data) ? data[0] : data;
      setRecords((row as Records) || null);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Osobní rekordy
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!records || (!records.longest_km && !records.fastest_kmh && !records.most_elevation)) return null;

  const items = [
    records.longest_km != null && {
      icon: Route,
      value: `${Number(records.longest_km).toLocaleString("cs-CZ")} km`,
      label: "Nejdelší jízda",
      date: fmtDate(records.longest_date),
    },
    records.fastest_kmh != null && {
      icon: Gauge,
      value: `${Number(records.fastest_kmh).toLocaleString("cs-CZ")} km/h`,
      label: "Nejrychlejší jízda (20+ km)",
      date: fmtDate(records.fastest_date),
    },
    records.most_elevation != null && {
      icon: Mountain,
      value: `${Number(records.most_elevation).toLocaleString("cs-CZ")} m`,
      label: "Nejvíc nastoupáno",
      date: fmtDate(records.most_elevation_date),
    },
  ].filter(Boolean) as { icon: typeof Route; value: string; label: string; date: string }[];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Osobní rekordy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center p-3 rounded-xl bg-muted/40">
              <div className="flex items-center justify-center mb-2">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {item.date && (
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.date}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MemberRecords;
