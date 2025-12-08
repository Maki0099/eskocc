// Centralized type definitions for the application

/**
 * Application role type - matches the app_role enum in Supabase
 */
export type AppRole = "pending" | "member" | "active_member" | "admin";

/**
 * Challenge settings structure for yearly cycling challenges
 */
export interface ChallengeSettings {
  year: number;
  target_under_40: number;
  target_under_60: number;
  target_over_60: number;
  club_total_target: number;
}
