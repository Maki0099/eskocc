import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Mountain } from "lucide-react";
import { getInitials } from "@/lib/user-utils";

interface MonthlyRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  km: number;
  elevation: number;
  rides: number;
}

const monthName = new Intl.DateTimeFormat("cs-CZ", { month: "long" }).format(new Date());

const MonthlyLeaderboard = () => {
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const now = new Date();
      const { data } = await supabase.rpc("get_monthly_leaderboard" as any, {
        _year: now.getFullYear(),
        _month: now.getMonth() + 1,
      });
      if (!active) return;
      setRows((data as any as MonthlyRow[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="animate-fade-up">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Tento měsíc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="animate-fade-up">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Tento měsíc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            V {monthName} zatím nikdo z propojených členů nejel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxKm = Math.max(...rows.map((r) => Number(r.km)), 1);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Tento měsíc ({monthName})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {rows.map((row, index) => {
            const pct = Math.max((Number(row.km) / maxKm) * 100, 4);
            return (
              <div key={row.user_id} className="p-3 rounded-xl bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-medium text-muted-foreground shrink-0">
                    {index + 1}.
                  </span>
                  <Link
                    to={`/member/${row.user_id}`}
                    className="flex items-center gap-2.5 min-w-0 w-28 sm:w-44 shrink-0 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="w-8 h-8 border-2 border-background shadow-sm shrink-0">
                      <AvatarImage src={row.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials(row.full_name, null)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">{row.full_name || "Bez jména"}</span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 text-sm mb-1">
                      <span className="font-semibold">{Number(row.km).toLocaleString("cs-CZ")} km</span>
                      <span className="text-[11px] sm:text-xs text-muted-foreground inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        <Mountain className="w-3 h-3" />
                        {Number(row.elevation).toLocaleString("cs-CZ")} m · {row.rides}×
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted border border-border/60 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyLeaderboard;
