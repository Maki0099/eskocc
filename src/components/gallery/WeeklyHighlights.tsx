import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Mountain, MapPin, Flame } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { getSportMeta, formatDistanceKm } from "@/lib/sport-type-utils";

interface ClubActivity {
  id: string;
  athlete_full: string;
  athlete_firstname: string;
  athlete_lastname_initial: string | null;
  matched_user_id: string | null;
  distance_m: number;
  elevation_gain: number;
  sport_type: string | null;
  activity_date: string;
}

interface MemberProfile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-orange-600"];

const WeeklyHighlights = () => {
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const { data, error } = await supabase
          .from("club_activities")
          .select(
            "id, athlete_full, athlete_firstname, athlete_lastname_initial, matched_user_id, distance_m, elevation_gain, sport_type, activity_date"
          )
          .gte("activity_date", since.toISOString())
          .order("distance_m", { ascending: false })
          .limit(50);

        if (error) throw error;
        const acts = (data || []) as ClubActivity[];
        setActivities(acts);

        const ids = Array.from(
          new Set(acts.map((a) => a.matched_user_id).filter((v): v is string => !!v))
        );
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("member_profiles_public")
            .select("id, full_name, nickname, avatar_url")
            .in("id", ids);
          const map: Record<string, MemberProfile> = {};
          (profs || []).forEach((p) => {
            if (p.id) map[p.id] = p as MemberProfile;
          });
          setProfiles(map);
        }
      } catch (e) {
        console.error("Error fetching weekly highlights:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const top3 = useMemo(() => activities.slice(0, 3), [activities]);

  const leader = useMemo(() => {
    // Aggregate distance per athlete (use matched_user_id if present, else athlete_full)
    const totals = new Map<string, { name: string; userId: string | null; meters: number }>();
    activities.forEach((a) => {
      const key = a.matched_user_id || `name:${a.athlete_full}`;
      const profile = a.matched_user_id ? profiles[a.matched_user_id] : null;
      const name = profile?.nickname || profile?.full_name || a.athlete_full;
      const cur = totals.get(key) || { name, userId: a.matched_user_id, meters: 0 };
      cur.meters += a.distance_m;
      cur.name = name;
      totals.set(key, cur);
    });
    let best: { name: string; userId: string | null; meters: number } | null = null;
    totals.forEach((v) => {
      if (!best || v.meters > best.meters) best = v;
    });
    return best;
  }, [activities, profiles]);

  if (loading) {
    return (
      <div className="mb-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (top3.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-semibold">Highlights týdne</h2>
        </div>
        {leader && leader.meters > 0 && (
          <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs">
              Nejvíc km: <span className="font-semibold">{leader.name}</span> · {formatDistanceKm(leader.meters)} km
            </span>
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {top3.map((a, idx) => {
          const meta = getSportMeta(a.sport_type);
          const Icon = meta.icon;
          const profile = a.matched_user_id ? profiles[a.matched_user_id] : null;
          const displayName =
            profile?.nickname || profile?.full_name || a.athlete_full || a.athlete_firstname;
          const NameTag: any = profile ? Link : "span";
          const nameProps = profile ? { to: `/member/${profile.id}` } : {};

          return (
            <Card
              key={a.id}
              className="overflow-hidden bg-gradient-to-br from-primary/5 to-transparent border-primary/20"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className={`w-5 h-5 ${MEDAL_COLORS[idx]}`} />
                    <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                  </div>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </Badge>
                </div>

                <NameTag
                  {...nameProps}
                  className={`block font-semibold mb-1 truncate ${profile ? "hover:text-primary transition-colors" : ""}`}
                >
                  {displayName}
                </NameTag>
                <p className="text-xs text-muted-foreground mb-3">
                  {format(new Date(a.activity_date), "d. M. yyyy", { locale: cs })}
                </p>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold text-lg">{formatDistanceKm(a.distance_m)}</span>
                    <span className="text-xs text-muted-foreground">km</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{a.elevation_gain}</span>
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyHighlights;
