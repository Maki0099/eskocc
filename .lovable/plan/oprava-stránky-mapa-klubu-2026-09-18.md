# Oprava stránky Mapa klubu

## Problémy
1. **Mapa se nevykresluje** — body jízd se načítají (59 jízd), ale podkladová mapa je prázdná. Stránka na rozdíl od mapy na stránce „O klubu" nemá žádné ošetření chyb ani obnovu velikosti mapy, takže při problému s načtením podkladu zůstane jen prázdný rámeček bez jakékoli hlášky.
2. **Chybí návrat zpět** — na stránce není žádný odkaz/tlačítko zpět na Statistiky.
3. **Adresa /club-map končí na 404** — existuje jen adresa `/mapa-klubu`; starší/anglická varianta není obsloužena.

## Řešení

### 1. Robustní vykreslení mapy (`src/pages/ClubMap.tsx`)
- Přidat stav `mapError` a obsluhu události `error` mapy — při selhání se místo prázdného rámečku zobrazí srozumitelná hláška „Nepodařilo se načíst mapu" (stejný vzor jako `ClubLocationMap`).
- Po události `load` zavolat `map.resize()`, aby se mapa správně překreslila i když se kontejner roztáhl až po inicializaci (typická příčina prázdné mapy).
- Inicializaci mapy spustit až ve chvíli, kdy je potvrzeno členství (`isMember`) i načtená data — mapa se vytvoří jednou, markery se přidají po `load`.

### 2. Tlačítko zpět
- Nad nadpis přidat odkaz „← Zpět na statistiky" (`Link` na `ROUTES.STATISTICS`, ikona `ArrowLeft`), vlevo nad obsahem — konzistentní s ostatními podstránkami.

### 3. Přesměrování /club-map
- V `src/App.tsx` přidat route `/club-map` s `<Navigate to="/mapa-klubu" replace />`, aby stará adresa nekončila na 404.

## Technické poznámky
- Žádné změny v databázi ani v synchronizaci — čistě frontend.
- Mapbox token a styl `light-v11` zůstávají stejné jako u fungující mapy na stránce „O klubu".
- Ověření: build + vizuální kontrola stránky `/mapa-klubu` (mapa s body, tlačítko zpět) a přesměrování `/club-map`.
