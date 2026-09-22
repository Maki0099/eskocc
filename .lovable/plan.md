# Oprava chyby „Load Failed“ při obnovení aplikace

## Co se děje

V nainstalované aplikaci tlačítko **Vynutit obnovení aplikace** (Nastavení účtu) skončí chybou „Load Failed“. To je hláška prohlížeče (typicky Safari / iPhone) ve chvíli, kdy se nepodaří stáhnout soubor ze sítě.

Nejpravděpodobnější příčina — zatím **nepotvrzená**, proto ji ověříme jako první krok: tlačítko nejdřív smaže **všechny** uložené soubory aplikace včetně těch, ze kterých aplikace startuje, a teprve potom se pokouší stáhnout novou verzi. Když stahování na mobilní síti zakolísá, aplikace už nemá z čeho běžet a skončí chybou.

## Postup

1. **Ověřit skutečnou chybu** — v aplikaci dočasně zobrazit přesné znění chyby a místo, kde vznikla, a nechat tě tlačítko znovu zkusit. Podle výsledku potvrdit nebo upravit příčinu níže.
2. **Změnit pořadí obnovení** — nejdřív stáhnout a aktivovat novou verzi, teprve pak uklidit staré soubory. Soubory potřebné pro start aplikace se nemažou.
3. **Mazat jen dočasná data** — obrázky, mapové dlaždice a odpovědi ze serveru; základ aplikace zůstane, takže i při výpadku sítě se aplikace vždy spustí.
4. **Chování bez internetu** — když je zařízení offline, rovnou zobrazit srozumitelnou hlášku „Nejsi online, obnovení vyžaduje připojení“ místo pádu.
5. **Když se nová verze nepodaří stáhnout** — aplikaci nechat běžet na stávající verzi a zobrazit hlášku s tlačítkem „Zkusit znovu“, ne prázdnou obrazovku.
6. **Sjednotit s tlačítkem „Aktualizovat“** v hlášce o nové verzi, aby obě cesty dělaly totéž.
7. **Ověření** — zkouška v náhledu (desktop i mobilní velikost) a potom potvrzení přímo na tvém telefonu.

## Technické detaily

- `src/components/pwa/ForceRefreshButton.tsx`: dnes maže `caches.keys()` bez výjimky, až poté volá `registration.update()` a `location.replace`. Nové pořadí: `navigator.onLine` guard → `reg.update()` → čekat na `installing`/`waiting` → `SKIP_WAITING` + `controllerchange` → smazat jen runtime cache (`supabase-api-cache`, `supabase-storage-cache`, `images-cache`, `mapbox-cache`, `gpx-cache`) a nikdy `workbox-precache*` → reload. Chyba se vypíše i s `err.message`.
- `src/components/pwa/UpdatePrompt.tsx`: stejná ochrana, `updateServiceWorker(true)` obalit try/catch s konkrétní hláškou; fallback reload jen když aktivace uspěje.
- Bez zásahu do `vite.config.ts` (`workbox` konfigurace) a bez migrací; `public/sw-push.js` zůstává nedotčený.
