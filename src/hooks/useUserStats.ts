import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/types";

interface UserProfile {
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  club_match_name: string | null;
}

interface UserStats {
  ytdDistance: number | null;
  ytdCount: number | null;
  personalYtdDistance: number | null;
  personalYtdCount: number | null;
  personalStatsCachedAt: string | null;
  profile: UserProfile | null;
  role: AppRole | null;
  loading: boolean;
  refreshing: boolean;
  refetch: () => Promise<void>;
}

export const useUserStats = (): UserStats => {
  const { user } = useAuth();
  const [ytdDistance, setYtdDistance] = useState<number | null>(null);
  const [ytdCount, setYtdCount] = useState<number | null>(null);
  const [personalYtdDistance, setPersonalYtdDistance] = useState<number | null>(null);
  const [personalYtdCount, setPersonalYtdCount] = useState<number | null>(null);
  const [personalStatsCachedAt, setPersonalStatsCachedAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, nickname, avatar_url, club_match_name, strava_ytd_distance, strava_ytd_count, personal_ytd_distance, personal_ytd_count, personal_stats_cached_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData) {
      setYtdDistance(profileData.strava_ytd_distance);
      setYtdCount(profileData.strava_ytd_count);
      setPersonalYtdDistance((profileData as any).personal_ytd_distance ?? null);
      setPersonalYtdCount((profileData as any).personal_ytd_count ?? null);
      setPersonalStatsCachedAt((profileData as any).personal_stats_cached_at ?? null);
      setProfile({
        full_name: profileData.full_name,
        nickname: profileData.nickname,
        avatar_url: profileData.avatar_url,
        club_match_name: profileData.club_match_name,
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData) {
      setRole(roleData.role as AppRole);
    }

    setLoading(false);
    setRefreshing(false);
  }, [user]);

  const refetch = useCallback(async () => {
    await fetchStats(true);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats(false);
  }, [fetchStats]);

  return {
    ytdDistance,
    ytdCount,
    personalYtdDistance,
    personalYtdCount,
    personalStatsCachedAt,
    profile,
    role,
    loading,
    refreshing,
    refetch,
  };
};
