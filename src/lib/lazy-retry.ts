import { lazy, type ComponentType } from "react";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** lazy() with retries – hosting may briefly reject bursts (HTTP 429). */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 4,
) {
  return lazy(async () => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await factory();
      } catch (e) {
        lastErr = e;
        await wait(600 * (i + 1));
      }
    }
    const key = "esko_chunk_reload";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
    throw lastErr;
  });
}
