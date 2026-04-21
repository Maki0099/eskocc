import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Mountain, Clock, MapPin } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import {
  getSportMeta,
  formatDistanceKm,
  formatMovingTime,
  type SportTypeMeta,
} from "@/lib/sport-type-utils";

interface ClubActivity {
  id: string;
  athlete_full: string;
  athlete_firstname: string;
  athlete_lastname_initial: string | null;
  matched_user_id: string | null;
  distance_m: number;
  elevation_gain: number;
  moving_time: number;
  sport_type: string | null;
  activity_date: string;
}

interface MemberProfile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

type FilterGroup = "all" | SportTypeMeta["group"];

const FILTERS: { value: FilterGroup; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "road", label: "Silnice" },
  { value: "mtb", label: "MTB" },
  { value: "gravel", label: "Gravel" },
  { value: "run", label: "Běh" },
];

const dayLabel = (date: Date): string => {
  if (isToday(date)) return "Dnes";
  if (isYesterday(date)) return "Včera";
  return format(date, "EEEE d. MMMM", { locale: cs });
};

const RecentClubActivities = () => {
  const [activities, setActivities] = useState<ClubActivity[]>([]);
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 14);

        const { data, error } = await supabase
          .from("club_activities")
          .select(
            "id, athlete_full, athlete_firstname, athlete_lastname_initial, matched_user_id, distance_m, elevation_gain, moving_time, sport_type, activity_date"
          )
          .gte("activity_date", since.toISOString())
          .order("activity_date", { ascending: false })
          .limit(100);

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
        console.error("Error fetching club activities:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((a) => getSportMeta(a.sport_type).group === filter);
  }, [activities, filter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { date: Date; items: ClubActivity[] }>();
    filtered.forEach((a) => {
      const d = startOfDay(new Date(a.activity_date));
      const key = d.toISOString();
      if (!groups.has(key)) groups.set(key, { date: d, items: [] });
      groups.get(key)!.items.push(a);
    });
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
            className="rounded-full"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Za posledních 14 dní žádné aktivity{filter !== "all" ? " v této kategorii" : ""}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <div key={g.date.toISOString()}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground border-b pb-2 capitalize">
                {dayLabel(g.date)}
                <span className="ml-2 text-xs font-normal">
                  ({g.items.length} {g.items.length === 1 ? "jízda" : g.items.length < 5 ? "jízdy" : "jízd"})
                </span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {g.items.map((a) => {
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
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <NameTag
                                {...nameProps}
                                className={`block font-medium truncate ${profile ? "hover:text-primary transition-colors" : ""}`}
                              >
                                {displayName}
                              </NameTag>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(a.activity_date), { addSuffix: true, locale: cs })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {meta.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{formatDistanceKm(a.distance_m)} km</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mountain className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{a.elevation_gain} m</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{formatMovingTime(a.moving_time)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentClubActivities;
