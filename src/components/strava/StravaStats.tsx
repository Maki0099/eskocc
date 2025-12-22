import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Mountain, Clock, TrendingUp } from "lucide-react";
import stravaLogo from "@/assets/strava-logo.svg";
import { StravaStatsSkeleton } from "@/components/strava/StravaSkeletons";

interface StravaStatsProps {
  userId: string;
  isConnected: boolean;
}

interface StatsData {
  all_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elevation_gain: number;
  };
  ytd_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elevation_gain: number;
  };
  recent_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elevation_gain: number;
  };
}

const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k` : km.toFixed(0);
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k h`;
  return `${hours} h`;
};

const formatElevation = (meters: number): string => {
  if (meters >= 1000000) return `${(meters / 1000000).toFixed(1)}M`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(0)}k`;
  return meters.toFixed(0);
};

export const StravaStats = ({ userId, isConnected }: StravaStatsProps) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('strava-stats', {
          body: { userId }
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch Strava stats:', err);
        setError('Nepodařilo se načíst statistiky');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, isConnected]);

  if (!isConnected) return null;

  if (loading) {
    return <StravaStatsSkeleton />;
  }

  if (error) {
    return (
      <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const allTime = stats.all_ride_totals;
  const ytd = stats.ytd_ride_totals;

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <img 
          src={stravaLogo} 
          alt="Strava" 
          className="h-4 w-auto"
        />
        Strava statistiky
      </h3>
      
      {/* All-time stats */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
        <p className="text-xs text-muted-foreground mb-3">Celkem</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Bike className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">{allTime.count}</p>
              <p className="text-xs text-muted-foreground">jízd</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">{formatDistance(allTime.distance)} km</p>
              <p className="text-xs text-muted-foreground">vzdálenost</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Mountain className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">{formatElevation(allTime.elevation_gain)} m</p>
              <p className="text-xs text-muted-foreground">převýšení</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">{formatTime(allTime.moving_time)}</p>
              <p className="text-xs text-muted-foreground">v sedle</p>
            </div>
          </div>
        </div>
      </div>

      {/* YTD stats */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
        <p className="text-xs text-muted-foreground mb-3">Tento rok</p>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Bike className="w-4 h-4 text-muted-foreground" />
            {ytd.count} jízd
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            {formatDistance(ytd.distance)} km
          </span>
          <span className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-muted-foreground" />
            {formatElevation(ytd.elevation_gain)} m
          </span>
        </div>
      </div>
    </div>
  );
};
