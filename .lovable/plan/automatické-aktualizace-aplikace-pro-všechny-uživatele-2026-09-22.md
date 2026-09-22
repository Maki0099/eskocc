# Automatické aktualizace aplikace pro všechny uživatele

## Problém

Nová verze aplikace se uživatelům stáhne automaticky na pozadí, ale **stránka zůstane na staré verzi, dokud uživatel sám neklikne na „Aktualizovat"** v oznámení. Kdo oznámení přehlédne nebo zavře, používá dál starou verzi (přesně tvůj případ — anonymní okno bylo OK, protože nemělo uloženou starou verzi).

## Řešení

Aktualizace se bude používat **sama, bez klikání**:

1. Jakmile je nová verze připravená, aplikace zobrazí krátké oznámení „Načítám novou verzi…" a **automaticky se po pár vteřinách sama obnoví** na novou verzi.
2. Když zrovna probíhá důležitá akce, nestane se nic zlého — obnovení je jen načtení stránky, data v databázi nejsou dotčená. (Případné rozpracované formuláře jsou jediná drobnost, která se zruší — proto krátká pauza s viditelným oznámením.)
3. Oznámení „Je dostupná nová verze" s tlačítkem zůstane jako okamžitá varianta — kliknutí aktualizuje hned, jinak se to stane samo.
4. Kontrola nové verze zůstane jako doteď: při otevření aplikace, při návratu do okna a každou hodinu.

Tlačítko „Vynutit obnovení aplikace" v Nastavení účtu zůstává beze změny jako nouzová možnost.

## Technické detaily

- `src/components/pwa/UpdatePrompt.tsx`: v efektu na `needRefresh` spustit odpočet (cca 8 s) → automaticky zavolat stávající `applyUpdate()` (který už umí: aktivovat nový service worker, vyčistit dočasné mezipaměti, znovu načíst stránku, ošetřit výpadek sítě). Toast přejít na variantu s odpočtem a tlačítkem „Aktualizovat nyní".
- Stávající logika `updateServiceWorker` / `clearRuntimeCaches` z `src/lib/pwa-update.ts` se nemění.
- `skipWaiting` + `clientsClaim` + `registerType: 'autoUpdate'` ve `vite.config.ts` už nastavené jsou — nový SW se aktivuje sám, chybělo jen automatické znovunačtení stránky.

## Ověření

- Typecheck a build bez chyb.
- Kontrola v prohlížeči, že aplikace startuje bez chyb a mechanismus je zavedený.
