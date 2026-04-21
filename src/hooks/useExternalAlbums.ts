import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExternalAlbum {
  id: string;
  title: string;
  url: string;
  cover_image_url: string | null;
  year: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useExternalAlbums = () => {
  const [albums, setAlbums] = useState<ExternalAlbum[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlbums = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("external_albums")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setAlbums(data || []);
    } catch (error) {
      console.error("Error fetching external albums:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  return { albums, loading, refetch: fetchAlbums };
};
