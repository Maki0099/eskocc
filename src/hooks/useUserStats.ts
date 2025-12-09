import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/types";

interface UserProfile {
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  strava_id: string | null;
  is_strava_club_member: boolean | null;
}

interface UserStats {
  ytdDistance: number | null;
  ytdCount: number | null;
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

    // Fetch profile with stats
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, nickname, avatar_url, strava_id, is_strava_club_member, strava_ytd_distance, strava_ytd_count')
      .eq('id', user.id)
      .maybeSingle();

    if (profileData) {
      setYtdDistance(profileData.strava_ytd_distance);
      setYtdCount(profileData.strava_ytd_count);
      setProfile({
        full_name: profileData.full_name,
        nickname: profileData.nickname,
        avatar_url: profileData.avatar_url,
        strava_id: profileData.strava_id,
        is_strava_club_member: profileData.is_strava_club_member,
      });
    }

    // Fetch role
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

  return { ytdDistance, ytdCount, profile, role, loading, refreshing, refetch };
};
