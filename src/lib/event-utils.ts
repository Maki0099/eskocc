import { addDays, endOfDay, endOfWeek, isBefore, startOfDay } from "date-fns";

export interface EventLike {
  id: string;
  event_date: string;
  is_strava_event?: boolean;
  sport_type?: string | null;
  distance_km?: number | null;
  gpx_file_url?: string | null;
}

export type PeriodKey = "thisWeek" | "nextWeek" | "later";

export interface PeriodGroup<T extends EventLike> {
  key: PeriodKey;
  label: string;
  events: T[];
}

/** Group events into "Tento týden", "Příští týden", "Později". Empty groups omitted. */
export const groupEventsByPeriod = <T extends EventLike>(events: T[]): PeriodGroup<T>[] => {
  const now = new Date();
  // Week starts on Monday (cs locale)
  const thisWeekEnd = endOfDay(endOfWeek(now, { weekStartsOn: 1 }));
  const nextWeekEnd = endOfDay(addDays(thisWeekEnd, 7));

  const groups: Record<PeriodKey, T[]> = {
    thisWeek: [],
    nextWeek: [],
    later: [],
  };

  events.forEach((e) => {
    const d = new Date(e.event_date);
    if (isBefore(d, thisWeekEnd) || d.getTime() === thisWeekEnd.getTime()) {
      groups.thisWeek.push(e);
    } else if (isBefore(d, nextWeekEnd) || d.getTime() === nextWeekEnd.getTime()) {
      groups.nextWeek.push(e);
    } else {
      groups.later.push(e);
    }
  });

  const out: PeriodGroup<T>[] = [];
  if (groups.thisWeek.length) out.push({ key: "thisWeek", label: "Tento týden", events: groups.thisWeek });
  if (groups.nextWeek.length) out.push({ key: "nextWeek", label: "Příští týden", events: groups.nextWeek });
  if (groups.later.length) out.push({ key: "later", label: "Později", events: groups.later });
  return out;
};

/** Pick the soonest upcoming event within a window (default 7 days). */
export const getNextUpEvent = <T extends EventLike>(
  events: T[],
  windowDays = 7
): T | null => {
  if (!events.length) return null;
  const now = new Date();
  const limit = endOfDay(addDays(startOfDay(now), windowDays));
  const sorted = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
  const next = sorted[0];
  if (!next) return null;
  return new Date(next.event_date) <= limit ? next : null;
};

export type SportFilter = "all" | "road" | "mtb" | "gravel" | "gpx";

export const matchesSportFilter = (e: EventLike, filter: SportFilter): boolean => {
  if (filter === "all") return true;
  if (filter === "gpx") return !!e.gpx_file_url;
  const st = e.sport_type;
  if (filter === "road") return st === "Ride" || st === "VirtualRide" || st === "EBikeRide";
  if (filter === "mtb") return st === "MountainBikeRide" || st === "EMountainBikeRide";
  if (filter === "gravel") return st === "GravelRide";
  return true;
};

/** Czech-pluralized "X jdou / jde" helper for participant counts. */
export const pluralizeGoing = (count: number): string => {
  if (count === 1) return "1 jde";
  if (count >= 2 && count <= 4) return `${count} jdou`;
  return `${count} jde`;
};
