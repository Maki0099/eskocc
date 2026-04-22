

## Vylepšení flow „Aktualizovat" — čistý reload bez starých stavů

### Proč to chceš

Když uživatel klikne „Aktualizovat", aktuálně se:
1. Smažou runtime caches
2. Zavolá `updateServiceWorker(true)` → workbox pošle `SKIP_WAITING` novému SW a reloadne **aktuální tab**.

**Problém:** Pokud má uživatel otevřených víc tabů/oken PWA (typicky na desktopu nebo v PWA na Androidu se zachovaným stavem), ostatní instance dál běží na **staré JS verzi**, ale nový SW už servíruje **nové assety**. Vznikne nekonzistence: chunk load errors, nefunkční lazy routes, divné chování dokud uživatel ručně nezavře ostatní taby.

### Návrh řešení

V `handleUpdate` (v `UpdatePrompt.tsx`) udělat **explicitně tento sled kroků**:

1. **Vyčistit runtime caches** (už máme).
2. **Najít všechny otevřené clients (taby/okna)** přes `navigator.serviceWorker.controller` a zavřít/přesměrovat je — ve skutečnosti **nemůžeme zavřít cizí taby z window kontextu** (browser security). Ale můžeme **poslat zprávu SW**, který zná všechny clients, a ten je „kopne" k reloadu.
3. **Aktivovat nový SW** přes `updateServiceWorker(true)` — pošle `SKIP_WAITING`.
4. **Po `controllerchange`** (nový SW převzal kontrolu) → poslat všem clients zprávu `RELOAD_NOW`.
5. **Service Worker** (`sw-push.js`) zachytí message, projde `clients.matchAll()` a zavolá `client.navigate(client.url)` na všech → každý tab se reloadne na čerstvou verzi.

### Konkrétní změny

#### A) `src/components/pwa/UpdatePrompt.tsx` — handleUpdate

```ts
const handleUpdate = async () => {
  // 1. Vyčistit runtime caches (kromě precache, tu řeší SW)
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith("workbox-precache"))
          .map((k) => caches.delete(k))
      );
    } catch (err) {
      console.warn("Cache cleanup failed:", err);
    }
  }

  // 2. Po převzetí kontroly novým SW → reload všech clients
  //    (musíme listener registrovat PŘED skipWaiting)
  const onControllerChange = () => {
    navigator.serviceWorker.controller?.postMessage({ type: "RELOAD_ALL_CLIENTS" });
    // Současný tab reloadneme pro jistotu sami (SW message je async)
    setTimeout(() => window.location.reload(), 100);
  };
  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, { once: true });

  // 3. Aktivovat čekající SW (skipWaiting)
  await updateServiceWorker(true);
};
```

#### B) `public/sw-push.js` — přidat handler

Přidat na konec souboru:

```js
// Reload all open clients when prompted from the page after SW update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "RELOAD_ALL_CLIENTS") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        return Promise.all(
          clientList.map((client) => {
            // navigate() vrátí klienta na stejnou URL → čerstvý load z nového SW
            return client.navigate(client.url).catch(() => client.focus());
          })
        );
      })
    );
  }
});
```

> Pozn.: `client.navigate()` funguje jen pro same-origin URL a klienta, který je „controlled" novým SW. Po `skipWaiting` + `clients.claim` (workbox to dělá automaticky při `updateServiceWorker(true)`) jsou všechny taby pod kontrolou nového SW → bude to fungovat.

### Co to vyřeší

- **Desktop PWA s víc okny** → všechna se reloadnou současně, žádný tab nezůstane na staré verzi.
- **Mobil PWA + browser tab otevřený paralelně** → oba se synchronizují.
- **Race condition** mezi cache, SW aktivací a reloadem → eliminována (controllerchange = jistota, že nový SW vládne).

### Co zůstává

- `vite.config.ts` — beze změny.
- `CheckForUpdatesButton.tsx` — beze změny (jen detekuje, nereloaduje).
- Runtime caching strategie, push handlery v `sw-push.js` — beze změny.

### Soubory ke změně

- `src/components/pwa/UpdatePrompt.tsx` — upravit `handleUpdate` (controllerchange listener + reload trigger).
- `public/sw-push.js` — přidat `message` listener pro `RELOAD_ALL_CLIENTS`.

### Testování

Pouze v produkci (`eskocc.lovable.app` / `eskocc.cz`):
1. Otevřít PWA ve dvou tabech.
2. Nasadit novou verzi.
3. V jednom tabu kliknout „Aktualizovat" → **oba** taby by se měly reloadnout na novou verzi do 1–2 s.

