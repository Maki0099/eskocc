import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserStats {
  ytdDistance: number | null;
  ytdCount: number | null;
  loading: boolean;
}

export const useUserStats = (): UserStats => {
  const { user } = useAuth();
  const [ytdDistance, setYtdDistance] = useState<number | null>(null);
  const [ytdCount, setYtdCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('strava_ytd_distance, strava_ytd_count')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setYtdDistance(data.strava_ytd_distance);
        setYtdCount(data.strava_ytd_count);
      }
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  return { ytdDistance, ytdCount, loading };
};
