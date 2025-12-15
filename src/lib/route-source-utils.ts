import { Map, Navigation, Compass, Activity, Globe } from "lucide-react";

export interface RouteSourceInfo {
  name: string;
  icon: typeof Map;
  color: string;
}

export function getRouteSourceInfo(url: string | null | undefined): RouteSourceInfo | null {
  if (!url) return null;

  const urlLower = url.toLowerCase();

  if (urlLower.includes("mapy.cz")) {
    return {
      name: "Mapy.cz",
      icon: Map,
      color: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
    };
  }

  if (urlLower.includes("ridewithgps.com")) {
    return {
      name: "RideWithGPS",
      icon: Navigation,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
    };
  }

  if (urlLower.includes("komoot.com")) {
    return {
      name: "Komoot",
      icon: Compass,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
    };
  }

  if (urlLower.includes("strava.com")) {
    return {
      name: "Strava",
      icon: Activity,
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20",
    };
  }

  if (urlLower.includes("wikiloc.com")) {
    return {
      name: "Wikiloc",
      icon: Globe,
      color: "bg-lime-500/10 text-lime-600 border-lime-500/20 hover:bg-lime-500/20",
    };
  }

  if (urlLower.includes("garmin.com")) {
    return {
      name: "Garmin",
      icon: Navigation,
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/20",
    };
  }

  if (urlLower.includes("alltrails.com")) {
    return {
      name: "AllTrails",
      icon: Compass,
      color: "bg-teal-500/10 text-teal-600 border-teal-500/20 hover:bg-teal-500/20",
    };
  }

  if (urlLower.includes("trailforks.com")) {
    return {
      name: "Trailforks",
      icon: Map,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
    };
  }

  // Generic fallback
  return {
    name: "Mapa",
    icon: Globe,
    color: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  };
}
