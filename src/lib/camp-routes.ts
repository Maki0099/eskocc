import { supabase } from "@/integrations/supabase/client";

export const CAMP_BUCKET = "routes";
export const CAMP_PREFIX = "camp";
export const CURRENT_CAMP = "mallorca-2026";

export interface CampRoute {
  id: string;
  camp: string;
  slug: string;
  title: string;
  description: string;
  distance_km: number;
  elevation_m: number;
  difficulty: string;
  terrain: string;
  camp_day: number | null;
  gpx_path: string;
  mapy_url: string | null;
  cover_image_url: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
}

export interface CampPhoto {
  id: string;
  route_id: string;
  file_url: string;
  caption: string | null;
  sort_order: number;
  is_ai: boolean;
}

export const ROUTE_COLORS = ["#E4572E", "#2E86AB", "#7A6855", "#3BB273", "#8E44AD", "#F1A208", "#D7263D", "#1B998B"];

export const DIFFICULTY_LABEL: Record<string, string> = { easy: "Lehká", medium: "Střední", hard: "Náročná" };
export const TERRAIN_LABEL: Record<string, string> = { road: "Silnice", gravel: "Gravel", mtb: "MTB" };

export const campFileUrl = (path: string, v?: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const url = supabase.storage.from(CAMP_BUCKET).getPublicUrl(path).data.publicUrl;
  return v ? `${url}?v=${encodeURIComponent(v)}` : url;
};

export const parseGpxCoords = (text: string): [number, number][] => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  let pts = Array.from(doc.getElementsByTagName("trkpt"));
  if (pts.length === 0) pts = Array.from(doc.getElementsByTagName("rtept"));
  return pts
    .map((p) => [parseFloat(p.getAttribute("lon") || ""), parseFloat(p.getAttribute("lat") || "")] as [number, number])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b));
};

export const downloadFile = async (url: string, filename: string) => {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
