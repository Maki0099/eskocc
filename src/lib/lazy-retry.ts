import { lazy, type ComponentType } from "react";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RELOAD_KEY = "esko_chunk_reload_at";

/**
 * lazy() with retries – hosting may briefly reject bursts (HTTP 429), and after
 * a new deploy old chunk hashes disappear. On final failure, reload the page
 * (at most once per 30 s, so we never loop) to pick up the fresh index.html.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        const mod = await factory();
        return mod;
      } catch (e) {
        lastErr = e;
        if (i < retries) await wait(600 * (i + 1));
      }
    }
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
      // Keep suspense pending while the page reloads instead of blank-screening.
      return new Promise<{ default: T }>(() => {});
    }
    throw lastErr;
  });
}
