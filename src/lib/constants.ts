import type { AppRole } from "./types";

/**
 * Human-readable labels for user roles in Czech
 */
export const ROLE_LABELS: Record<AppRole, string> = {
  pending: "Čekající na schválení",
  member: "Člen",
  active_member: "Aktivní člen",
  admin: "Administrátor",
};

/**
 * Badge variant mappings for user roles
 */
export const ROLE_BADGE_VARIANTS: Record<AppRole, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  member: "secondary",
  active_member: "default",
  admin: "default",
};

/**
 * Roles that are considered "members" (have access to member-only content)
 */
export const MEMBER_ROLES: AppRole[] = ["member", "active_member", "admin"];

/**
 * Roles that can create events
 */
export const EVENT_CREATOR_ROLES: AppRole[] = ["active_member", "admin"];
