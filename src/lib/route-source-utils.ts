import { Map, Navigation, Compass, Activity, Globe, Bike, FileText, Mountain } from "lucide-react";

export interface RouteSourceInfo {
  name: string;
  icon: typeof Map;
  color: string;
  description?: string;
  gpxAvailable?: boolean;
}

export function getRouteSourceInfo(url: string | null | undefined): RouteSourceInfo | null {
  if (!url) return null;

  const urlLower = url.toLowerCase();

  // Check for GPX file
  if (urlLower.endsWith(".gpx")) {
    return {
      name: "GPX soubor",
      icon: FileText,
      color: "bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-500/20",
      description: "Přímý odkaz na GPX soubor",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("mapy.cz") || urlLower.includes("mapy.com")) {
    return {
      name: "Mapy.cz",
      icon: Map,
      color: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
      description: "České mapy s plánovačem tras",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("bicycle.holiday")) {
    return {
      name: "bicycle.holiday",
      icon: Bike,
      color: "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20",
      description: "České cyklotrasy a výlety",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("ridewithgps.com")) {
    return {
      name: "RideWithGPS",
      icon: Navigation,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
      description: "Plánovač cyklistických tras",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("komoot.com")) {
    return {
      name: "Komoot",
      icon: Compass,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
      description: "Outdoorové plánování tras",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("strava.com")) {
    return {
      name: "Strava",
      icon: Activity,
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20",
      description: "Sportovní sociální síť",
      gpxAvailable: false,
    };
  }

  if (urlLower.includes("wikiloc.com")) {
    return {
      name: "Wikiloc",
      icon: Globe,
      color: "bg-lime-500/10 text-lime-600 border-lime-500/20 hover:bg-lime-500/20",
      description: "Komunita outdoorových tras",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("garmin.com") || urlLower.includes("connect.garmin")) {
    return {
      name: "Garmin Connect",
      icon: Navigation,
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/20",
      description: "Garmin sportovní platforma",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("alltrails.com")) {
    return {
      name: "AllTrails",
      icon: Mountain,
      color: "bg-teal-500/10 text-teal-600 border-teal-500/20 hover:bg-teal-500/20",
      description: "Turistické trasy a stezky",
      gpxAvailable: true,
    };
  }

  if (urlLower.includes("trailforks.com")) {
    return {
      name: "Trailforks",
      icon: Map,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
      description: "MTB trasy a traily",
      gpxAvailable: true,
    };
  }

  // Check if it's a valid URL but unknown service
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      return {
        name: urlObj.hostname.replace("www.", ""),
        icon: Globe,
        color: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
        description: "Neznámá služba - zkusíme analyzovat",
        gpxAvailable: undefined,
      };
    }
  } catch {
    // Not a valid URL
  }

  return null;
}
