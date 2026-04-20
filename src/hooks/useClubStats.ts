import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClubStats {
  members: number;
  routes: number;
  events_total: number;
  gallery_items: number;
  ytd_km: number;
  ytd_rides: number;
}

export const useClubStats = () => {
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_public_club_stats");
      if (cancelled) return;
      if (!error && data) setStats(data as unknown as ClubStats);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
};

export const formatStatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "—";
  return value.toLocaleString("cs-CZ").replace(/,/g, " ");
};
