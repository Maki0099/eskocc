import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CalorieRow {
  month: number;
  calories: number;
  rides: number;
}

const MONTH_LABELS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

const CaloriesChart = ({ userId }: { userId: string }) => {
  const [rows, setRows] = useState<CalorieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_calories_monthly" as any, {
        _user_id: userId,
        _year: year,
      });
      if (!active) return;
      setRows((data as any as CalorieRow[]) || []);
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Kalorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + Number(r.calories || 0), 0);
  const chartData = rows.map((r) => ({
    month: MONTH_LABELS[r.month - 1] ?? String(r.month),
    calories: Number(r.calories),
  }));

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Spálené kalorie
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            Celkem {Math.round(total).toLocaleString("cs-CZ")} kcal
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${Math.round(value).toLocaleString("cs-CZ")} kcal`, "Kalorie"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "0.8rem",
                }}
              />
              <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default CaloriesChart;
