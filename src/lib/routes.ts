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
  CLUB_MAP: '/mapa-klubu',
  CLUB_RECORDS: '/rekordy-klubu',
  DOCUMENTS: '/dokumenty',
  INSTALL: '/install',
  NOTIFICATIONS: '/notifications',
  SHARE_TARGET: '/share-target',
  GUIDE_BESKYDY: '/pruvodce-beskydy',
  CAMP: '/mallorca',
} as const;

// Dynamic route patterns (for Route definitions in App.tsx)
export const ROUTE_PATTERNS = {
  EVENT_DETAIL: '/events/:id',
  MEMBER_PROFILE: '/member/:userId',
  ROUTE_DETAIL: '/routes/:id',
  SHARED_VIEW: '/s/:token',
  CAMP_ROUTE: '/mallorca/:slug',
  GUEST_ACCESS: '/host/:token',
} as const;

// Helper functions for dynamic routes
export const getEventDetailPath = (id: string): string => `/events/${id}`;
export const getMemberProfilePath = (userId: string): string => `/member/${userId}`;
export const getRouteDetailPath = (id: string): string => `/routes/${id}`;
export const getCampRoutePath = (slug: string): string => `/mallorca/${slug}`;
export const getClubRecordsPath = (): string => '/rekordy-klubu';

export type NavItem = {
  to: string;
  label: string;
  memberOnly?: boolean;
};

// Navigation items for header/footer, in the order they should be shown
export const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.STATISTICS, label: 'Statistiky' },
  { to: ROUTES.CLUB_MAP, label: 'Mapa klubu', memberOnly: true },
  { to: ROUTES.CAMP, label: 'Mallorca', memberOnly: true },
  { to: ROUTES.EVENTS, label: 'Vyjížďky' },
  { to: ROUTES.GALLERY, label: 'Galerie' },
  { to: ROUTES.CAFE, label: 'Kavárna' },
  { to: ROUTES.ABOUT, label: 'O klubu' },
];

export type RouteKey = keyof typeof ROUTES;
export type RouteValue = (typeof ROUTES)[RouteKey];
