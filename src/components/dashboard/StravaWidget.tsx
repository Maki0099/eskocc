import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Mountain, TrendingUp, Loader2, LinkIcon, Users, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { STRAVA_CLUB_URL } from "@/lib/constants";
import stravaLogo from "@/assets/strava-logo.svg";
interface StravaWidgetProps {
  userId: string;
  isClubMember?: boolean;
}

interface MonthlyStats {
  month: string;
  distance: number;
  count: number;
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
  monthly_stats?: MonthlyStats[];
}

const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k` : km.toFixed(0);
};

const formatElevation = (meters: number): string => {
  if (meters >= 1000000) return `${(meters / 1000000).toFixed(1)}M`;
  if (meters >= 1000) return `${(meters / 1000).toFixed(0)}k`;
  return meters.toFixed(0);
};

const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
  return monthNames[parseInt(month) - 1] || month;
};

const CustomTooltip = ({ active, payload, label, metric }: { active?: boolean; payload?: Array<{ value: number; payload: MonthlyStats }>; label?: string; metric: 'distance' | 'count' }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium">
          {metric === 'distance' ? `${data.distance} km` : `${data.count} jízd`}
        </p>
        <p className="text-xs text-muted-foreground">
          {metric === 'distance' ? `${data.count} jízd` : `${data.distance} km`}
        </p>
      </div>
    );
  }
  return null;
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'právě teď';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `před ${hours} hod`;
  const days = Math.floor(hours / 24);
  return `před ${days} dny`;
};

export const StravaWidget = ({ userId, isClubMember = false }: StravaWidgetProps) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [stravaId, setStravaId] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'distance' | 'count'>('distance');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  useEffect(() => {
    const checkStravaAndFetchStats = async () => {
      // First check if user has Strava connected and get cached stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("strava_id, strava_monthly_stats, strava_stats_cached_at")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.strava_id) {
        setIsConnected(false);
        setLoading(false);
        return;
      }

      setIsConnected(true);
      setStravaId(profile.strava_id);

      // If we have cached stats, show them immediately
      if (profile.strava_monthly_stats) {
        setStats(profile.strava_monthly_stats as unknown as StatsData);
        if (profile.strava_stats_cached_at) {
          setCachedAt(new Date(profile.strava_stats_cached_at));
        }
        setLoading(false);
        
        // Check if cache is stale (older than 1 hour)
        const cacheAge = profile.strava_stats_cached_at 
          ? Date.now() - new Date(profile.strava_stats_cached_at).getTime()
          : Infinity;
        const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
        
        if (cacheAge > CACHE_DURATION) {
          // Refresh in background
          setIsRefreshing(true);
          try {
            const { data, error } = await supabase.functions.invoke('strava-stats', {
              body: { userId }
            });

            if (!error && data && !data.error) {
              setStats(data);
              setCachedAt(new Date());
            }
          } catch (err) {
            console.error('Failed to refresh Strava stats:', err);
          } finally {
            setIsRefreshing(false);
          }
        }
        return;
      }

      // No cached stats, fetch fresh data
      try {
        const { data, error } = await supabase.functions.invoke('strava-stats', {
          body: { userId }
        });

        if (!error && data && !data.error) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch Strava stats:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStravaAndFetchStats();
  }, [userId]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('strava-stats', {
        body: { userId, forceRefresh: true }
      });

      if (!error && data && !data.error) {
        setStats(data);
        setCachedAt(new Date());
      }
    } catch (err) {
      console.error('Failed to refresh Strava stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Načítám...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Link
        to="/account"
        className="group p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent hover:from-orange-500/10 transition-colors block"
      >
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={stravaLogo} 
            alt="Strava" 
            className="h-5 w-auto opacity-50 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <h3 className="font-medium mb-1 text-muted-foreground group-hover:text-foreground transition-colors">Propoj Strava</h3>
        <p className="text-sm text-muted-foreground">
          Zobraz své cyklistické statistiky
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
          <LinkIcon className="w-3 h-3" />
          Propojit účet
        </div>
      </Link>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
        <div className="flex items-center gap-3 mb-3">
          <img 
            src={stravaLogo} 
            alt="Strava" 
            className="h-5 w-auto"
          />
        </div>
        <p className="text-sm text-muted-foreground">Statistiky nejsou k dispozici</p>
      </div>
    );
  }

  const allTime = stats.all_ride_totals;
  const ytd = stats.ytd_ride_totals;
  const chartData = stats.monthly_stats?.map(item => ({
    ...item,
    name: formatMonth(item.month),
  })) || [];

  const stravaProfileUrl = `https://www.strava.com/athletes/${stravaId}`;

  return (
    <div className="group p-6 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:border-orange-500/40 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <a 
          href={stravaProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img 
            src={stravaLogo} 
            alt="Strava" 
            className="h-5 w-auto"
          />
          <span className="text-xs text-muted-foreground">Moje statistiky</span>
        </a>
        <div className="flex items-center gap-2">
          {cachedAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(cachedAt)}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-orange-500/10 transition-colors disabled:opacity-50"
            title="Obnovit statistiky"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {isClubMember && (
            <a
              href={STRAVA_CLUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <Badge variant="secondary" className="gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                <Users className="w-3 h-3" />
                Člen klubu
              </Badge>
            </a>
          )}
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Bike className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-xl font-bold">{allTime.count}</p>
          <p className="text-xs text-muted-foreground">jízd</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-xl font-bold">{formatDistance(allTime.distance)}</p>
          <p className="text-xs text-muted-foreground">km celkem</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Mountain className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-xl font-bold">{formatElevation(allTime.elevation_gain)}</p>
          <p className="text-xs text-muted-foreground">m převýšení</p>
        </div>
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              {chartMetric === 'distance' ? 'Vzdálenost (km)' : 'Počet jízd'} za posledních 12 měsíců
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setChartMetric('distance')}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  chartMetric === 'distance' 
                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                km
              </button>
              <button
                onClick={() => setChartMetric('count')}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  chartMetric === 'count' 
                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                jízdy
              </button>
            </div>
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval={1}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip metric={chartMetric} />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
                <Bar 
                  dataKey={chartMetric} 
                  fill="hsl(24.6 95% 53.1%)" 
                  radius={[2, 2, 0, 0]}
                  className="hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* YTD summary */}
      <div className="pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Letos: <span className="text-foreground font-medium">{ytd.count} jízd</span> · <span className="text-foreground font-medium">{formatDistance(ytd.distance)} km</span>
          </p>
          <a 
            href={stravaProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Zobrazit na Stravě
          </a>
        </div>
      </div>
    </div>
  );
};