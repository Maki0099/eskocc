import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Bike, Mountain, Sunrise, Repeat } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface BadgeRow {
  badge_key: string;
  label: string;
  detail: string;
  earned_at: string;
}

const BADGE_ICONS: Record<string, typeof Bike> = {
  stovka: Bike,
  horolezec: Mountain,
  brzy_rano: Sunrise,
  pravidelnost: Repeat,
};

const MemberBadges = ({ userId }: { userId: string }) => {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_badges" as any, { _user_id: userId });
      if (!active) return;
      setBadges((data as any as BadgeRow[]) || []);
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
            <Award className="w-5 h-5 text-primary" />
            Odznaky
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Odznaky
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.badge_key] ?? Award;
          return (
            <div
              key={badge.badge_key}
              className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{badge.label}</p>
                <p className="text-xs text-muted-foreground">{badge.detail}</p>
                {badge.earned_at && (
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {format(new Date(badge.earned_at), "d. M. yyyy", { locale: cs })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MemberBadges;
