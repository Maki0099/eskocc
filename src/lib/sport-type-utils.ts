import { Bike, Mountain, Route, Footprints, Activity, type LucideIcon } from "lucide-react";

export interface SportTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Bucket used by filter pills */
  group: "road" | "mtb" | "gravel" | "run" | "other";
}

const MAP: Record<string, SportTypeMeta> = {
  Ride: { label: "Silnice", icon: Bike, group: "road" },
  VirtualRide: { label: "Virtuální", icon: Bike, group: "road" },
  EBikeRide: { label: "E-bike", icon: Bike, group: "road" },
  GravelRide: { label: "Gravel", icon: Route, group: "gravel" },
  EMountainBikeRide: { label: "E-MTB", icon: Mountain, group: "mtb" },
  MountainBikeRide: { label: "MTB", icon: Mountain, group: "mtb" },
  Run: { label: "Běh", icon: Footprints, group: "run" },
  TrailRun: { label: "Trail", icon: Footprints, group: "run" },
};

export const getSportMeta = (sportType: string | null | undefined): SportTypeMeta => {
  if (!sportType) return { label: "Aktivita", icon: Activity, group: "other" };
  return MAP[sportType] ?? { label: sportType, icon: Activity, group: "other" };
};

export const formatDistanceKm = (meters: number): string => {
  const km = meters / 1000;
  return km >= 100 ? km.toFixed(0) : km.toFixed(1);
};

export const formatMovingTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
};
