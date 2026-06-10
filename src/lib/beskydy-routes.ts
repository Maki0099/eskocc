import { supabase } from "@/integrations/supabase/client";

export type BeskydyTerrain = "road" | "gravel" | "mtb";
export type BeskydyDifficulty = "easy" | "medium" | "hard";

export interface BeskydyRouteRow {
  id: string;
  slug: string;
  title: string;
  start_location: string;
  distance_km: number;
  elevation_m: number;
  terrain: string;
  difficulty: string;
  description: string;
  gpx_path: string;
  mapy_url: string | null;
  komoot_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeskydyRoute {
  id: string;
  slug: string;
  title: string;
  start: string;
  distanceKm: number;
  elevationM: number;
  terrain: BeskydyTerrain;
  difficulty: BeskydyDifficulty;
  description: string;
  gpxUrl: string;
  mapyUrl?: string;
  komootUrl?: string;
}

export const BESKYDY_GPX_BUCKET = "routes";
export const BESKYDY_GPX_PREFIX = "beskydy";

export const gpxStoragePathFor = (slug: string) =>
  `${BESKYDY_GPX_PREFIX}/${slug}.gpx`;

export const resolveGpxUrl = (gpx_path: string, updated_at?: string): string => {
  if (!gpx_path) return "";
  // Legacy / external paths
  if (gpx_path.startsWith("http://") || gpx_path.startsWith("https://") || gpx_path.startsWith("/")) {
    return gpx_path;
  }
  const { data } = supabase.storage.from(BESKYDY_GPX_BUCKET).getPublicUrl(gpx_path);
  const base = data.publicUrl;
  if (!updated_at) return base;
  const v = encodeURIComponent(updated_at);
  return `${base}${base.includes("?") ? "&" : "?"}v=${v}`;
};

export const mapRowToRoute = (row: BeskydyRouteRow): BeskydyRoute => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  start: row.start_location,
  distanceKm: row.distance_km,
  elevationM: row.elevation_m,
  terrain: (["road", "gravel", "mtb"].includes(row.terrain) ? row.terrain : "road") as BeskydyTerrain,
  difficulty: (["easy", "medium", "hard"].includes(row.difficulty) ? row.difficulty : "medium") as BeskydyDifficulty,
  description: row.description,
  gpxUrl: resolveGpxUrl(row.gpx_path, row.updated_at),
  mapyUrl: row.mapy_url ?? undefined,
  komootUrl: row.komoot_url ?? undefined,
});

export const slugify = (input: string): string =>
  input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
