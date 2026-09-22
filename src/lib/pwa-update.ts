/**
 * Sdílená logika pro aktualizaci PWA.
 *
 * Zásada: nikdy nemazat precache aplikace (workbox-precache*) dřív,
 * než je nová verze úspěšně stažená a aktivovaná. Jinak při výpadku
 * sítě nezbude nic, z čeho by aplikace nastartovala → „Load Failed“.
 */

const RUNTIME_CACHES = [
  "supabase-api-cache",
  "supabase-storage-cache",
  "images-cache",
  "mapbox-cache",
  "gpx-cache",
];

export async function clearRuntimeCaches() {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.startsWith("workbox-precache") && RUNTIME_CACHES.some((n) => k.includes(n)))
        .map((k) => caches.delete(k))
    );
  } catch (err) {
    console.warn("Runtime cache cleanup failed:", err);
  }
}

function waitForWaiting(reg: ServiceWorkerRegistration, timeoutMs = 20000) {
  return new Promise<ServiceWorker | null>((resolve) => {
    if (reg.waiting) return resolve(reg.waiting);
    const installing = reg.installing;
    if (!installing) return resolve(null);

    const timer = setTimeout(() => {
      installing.removeEventListener("statechange", onState);
      resolve(reg.waiting ?? null);
    }, timeoutMs);

    const onState = () => {
      if (installing.state === "installed") {
        clearTimeout(timer);
        installing.removeEventListener("statechange", onState);
        resolve(reg.waiting ?? installing);
      }
      if (installing.state === "redundant") {
        clearTimeout(timer);
        installing.removeEventListener("statechange", onState);
        resolve(null);
      }
    };
    installing.addEventListener("statechange", onState);
  });
}

/**
 * Stáhne a aktivuje novou verzi service workeru.
 * Vyhodí chybu, pokud stažení selže — volající pak nechá běžet stávající verzi.
 */
export async function activateNewVersion() {
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  // Může vyhodit TypeError („Load Failed“), když síť zakolísá — necháme probublat.
  await reg.update();

  const waiting = await waitForWaiting(reg);
  if (!waiting) return; // žádná nová verze, jedeme dál na stávající

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    navigator.serviceWorker.addEventListener("controllerchange", done, { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
    setTimeout(done, 5000);
  });
}
