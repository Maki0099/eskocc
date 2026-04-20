import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bike, TrendingUp, ExternalLink, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STRAVA_CLUB_URL } from "@/lib/constants";
import stravaLogo from "@/assets/strava-logo.svg";
import { StravaWidgetSkeleton } from "@/components/strava/StravaSkeletons";

interface StravaWidgetProps {
  userId: string;
  isClubMember?: boolean;
}

const formatDistance = (km: number): string => {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k` : km.toFixed(0);
};

export const StravaWidget = ({ userId, isClubMember = false }: StravaWidgetProps) => {
  const [ytdDistance, setYtdDistance] = useState<number>(0);
  const [ytdCount, setYtdCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("strava_ytd_distance, strava_ytd_count")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setYtdDistance(data.strava_ytd_distance ?? 0);
        setYtdCount(data.strava_ytd_count ?? 0);
      }
      setLoading(false);
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return <StravaWidgetSkeleton />;
  }

  return (
    <div className="group p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:border-orange-500/40 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={stravaLogo} alt="Strava" className="h-5 w-auto" />
          <span className="text-xs text-muted-foreground">Z klubu ESKO.cc</span>
        </div>
        <a
          href={STRAVA_CLUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <Badge variant="secondary" className="gap-1 text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
            <Users className="w-3 h-3" />
            Klub
          </Badge>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Bike className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold">{ytdCount}</p>
          <p className="text-xs text-muted-foreground">jízd letos</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold">{formatDistance(ytdDistance)}</p>
          <p className="text-xs text-muted-foreground">km letos</p>
        </div>
      </div>

      <div className="pt-3 border-t border-border/40">
        <a
          href={STRAVA_CLUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Otevřít klub na Stravě
        </a>
      </div>
    </div>
  );
};
