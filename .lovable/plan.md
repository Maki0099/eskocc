

## Audit PWA + spolehlivá aktualizace u nainstalovaných uživatelů

### Diagnóza současného stavu

**Co funguje:**
- `vite-plugin-pwa` je správně nakonfigurován (`vite.config.ts`): manifest, ikony, runtime caching pro Supabase/Mapbox/fonts, `navigateFallbackDenylist` na OAuth/dokumenty.
- `UpdatePrompt` registruje SW přes `useRegisterSW` a nabízí prompt „Nová verze".
- `sw-push.js` se přidává přes `importScripts` pro push + share target.
- 5minutový polling na update v `onRegisteredSW`.

**Problémy s aktualizací u nainstalovaných uživatelů:**

1. **Konflikt `registerType: "autoUpdate"` × prompt UI** — `autoUpdate` říká workboxu, ať nový SW okamžitě převezme kontrolu (`skipWaiting` + `clientsClaim`). Tím se ale **přeskočí stav `waiting`**, takže `needRefresh` se nemusí spolehlivě nastavit a uživatel prompt **neuvidí**. Stránka zatím běží na staré JS, ale SW už servíruje nové assety → nekonzistence (whitescreen, chunk load errors).

2. **Update check běží jen v otevřeném tabu** — 5min `setInterval` se spustí jen pokud je PWA aktivně otevřená. Když uživatel otevře app po týdnu, čeká 5 minut na první check (mezitím vidí starou verzi).

3. **Chybí check při startu a při návratu z pozadí** — žádný `r.update()` hned po registraci ani na `visibilitychange` / `focus`. Mobilní PWA běží v pozadí a budí se — ideální moment pro check.

4. **Chybí cache busting při manuálním reloadu** — pokud SW selže nebo je cache rozbitá, uživatel nemá únikovou cestu.

5. **`UpdatePrompt` mimo `BrowserRouter`** — drobnost, ale komponenta používá toast/UI a nesedí v hierarchii providerů (funguje, ale lepší přesunout dovnitř).

### Návrh řešení

#### 1. Přepnout na `registerType: "prompt"` (jednoznačná sémantika)

Ve `vite.config.ts`:
```ts
VitePWA({
  registerType: "prompt", // bylo "autoUpdate"
  // ...
})
```

Tím nový SW zůstane v `waiting` stavu dokud uživatel neklikne „Aktualizovat" → `updateServiceWorker(true)` ho aktivuje a reloadne stránku. **Konzistentní stav, žádný silent swap.**

#### 2. Vylepšit `UpdatePrompt.tsx` — agresivnější detekce updatů

```ts
useRegisterSW({
  onRegisteredSW(swUrl, r) {
    if (!r) return;
    
    // (a) Check ihned po registraci
    r.update();
    
    // (b) Pravidelný check každých 60 minut (z 5 min — šetří baterii)
    const interval = setInterval(() => r.update(), 60 * 60 * 1000);
    
    // (c) Check při návratu do appky (klíčové pro instalovanou PWA)
    const onVisible = () => {
      if (document.visibilityState === "visible") r.update();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    
    // cleanup ve return komponenty (uložit do ref)
  },
  onNeedRefresh() {
    // explicitní callback — prompt se zobrazí
  },
});
```

#### 3. Přidat „nuke cache" fallback do prompt UI

V `handleUpdate` před `updateServiceWorker(true)`:
```ts
// Pro jistotu vyčistit runtime caches (assets se nahradí čerstvými)
if ("caches" in window) {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((k) => !k.startsWith("workbox-precache")) // precache řeší SW sám
      .map((k) => caches.delete(k))
  );
}
await updateServiceWorker(true);
```

Tím se zbavíme starých Supabase/Mapbox response cache a uživatel po aktualizaci uvidí čerstvá data.

#### 4. (Volitelné) Ruční „Zkontrolovat aktualizace" v `Account` / patičce

Drobné tlačítko pro power-usery, které volá `r.update()` a zobrazí toast „Aplikace je aktuální" / „Nová verze k dispozici". Nice-to-have, ne nutné.

### Co zůstává beze změny

- `vite.config.ts` runtime caching strategie (Supabase/Mapbox/images) — jsou v pořádku.
- `sw-push.js` (push + share target) — funguje korektně.
- Manifest, ikony, splash screens — OK.
- `NetworkStatus` komponenta — OK.

### Dopad na uživatele s již nainstalovanou PWA

Po nasazení této změny:
1. Otevřou PWA → `r.update()` proběhne hned → pokud je nová verze, prompt se objeví do několika sekund.
2. Když mají PWA na pozadí a vrátí se → check při `visibilitychange` zachytí update.
3. Klik na „Aktualizovat" → smaže runtime cache + aktivuje nový SW + reload → čistá nová verze.

**Důležité:** Tato oprava se musí jednou nasadit, aby ji **stávající** SW přivezl. U úplně staré instalace, která má rozbitý či zaseklý SW, zafunguje až po prvním ručním reloadu (typicky pull-to-refresh nebo zavření a znovuotevření PWA). Toto je obecné omezení PWA, nelze obejít.

### Soubory ke změně

- **`vite.config.ts`** — `registerType: "autoUpdate"` → `"prompt"` (jediná řádka).
- **`src/components/pwa/UpdatePrompt.tsx`** — přidat `r.update()` při startu, `visibilitychange` + `focus` listenery (s cleanupem), prodloužit interval na 60 min, vyčistit runtime cache v `handleUpdate`.

### Co netestovat v Lovable preview

PWA service worker se v Lovable preview iframe typicky neaktivuje (a je to dobře — zabraňuje to cachování během vývoje). Update flow je třeba ověřit na **produkční doméně** (`eskocc.cz` / `eskocc.lovable.app`):
1. Otevřít PWA, počkat na registraci SW (Console: „Service Worker registered").
2. Nasadit novou verzi.
3. Zavřít a znovu otevřít PWA → prompt by se měl objevit do ~5 s.

