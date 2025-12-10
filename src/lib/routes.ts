/**
 * Centralized route constants for the application.
 * Use these constants instead of hardcoded strings for type safety and easier refactoring.
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  ACCOUNT: '/account',
  ADMIN: '/admin',
  EVENTS: '/events',
  GALLERY: '/gallery',
  CAFE: '/cafe',
  ABOUT: '/about',
  STATISTICS: '/statistiky',
  DOCUMENTS: '/dokumenty',
  INSTALL: '/install',
  NOTIFICATIONS: '/notifications',
} as const;

// Dynamic route patterns (for Route definitions in App.tsx)
export const ROUTE_PATTERNS = {
  EVENT_DETAIL: '/events/:id',
  MEMBER_PROFILE: '/member/:userId',
  ROUTE_DETAIL: '/routes/:id',
} as const;

// Helper functions for dynamic routes
export const getEventDetailPath = (id: string): string => `/events/${id}`;
export const getMemberProfilePath = (userId: string): string => `/member/${userId}`;
export const getRouteDetailPath = (id: string): string => `/routes/${id}`;

// Navigation items for header/footer
export const NAV_ITEMS = [
  { to: ROUTES.HOME, label: 'Domů' },
  { to: ROUTES.EVENTS, label: 'Vyjížďky' },
  { to: ROUTES.STATISTICS, label: 'Statistiky' },
  { to: ROUTES.CAFE, label: 'Kavárna' },
  { to: ROUTES.GALLERY, label: 'Galerie' },
  { to: ROUTES.ABOUT, label: 'O klubu' },
] as const;

export type RouteKey = keyof typeof ROUTES;
export type RouteValue = (typeof ROUTES)[RouteKey];
