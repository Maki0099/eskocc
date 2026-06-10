## Problém
Mini interaktivní Mapbox náhledy u 6 tras na `/pruvodce-beskydy` se vykreslují jako prázdné šedé boxy. Příčiny:
1. Preview běží na software WebGL — 6 paralelních Mapbox GL instancí na jedné stránce je nestabilních (velká přehledová mapa funguje protože je jediná v době renderu).
2. Lazy `IntersectionObserver` v `RouteGpxPreview.tsx` u některých karet nestihne přepnout `visible=true` (StrictMode + rychlé scrollování).
3. „Načítám náhled…" overlay má `text-muted-foreground` nad `bg-muted` — neviditelný kontrast, uživatel nevidí ani feedback.

## Řešení
Nahradit interaktivní WebGL náhled za **statický PNG obrázek z Mapbox Static Images API**. Pro účel „rychle si ověřit průběh trasy před stažením GPX" je to lepší volba:
- okamžité načtení (žádné WebGL, žádné tile fetch sekvence),
- 6 obrázků zvládne jakýkoli prohlížeč,
- lze lazy-loadovat nativně přes `loading="lazy"`,
- žádné cleanup/StrictMode hazardy.

## Co se změní

### `src/components/map/RouteGpxPreview.tsx` (přepis)
- Props beze změny: `gpxUrl`, `title`, `className`.
- Lifecycle:
  1. `useEffect` → `fetch(gpxUrl)` → `DOMParser` → vytáhnout `<trkpt>` body.
  2. **Zjednodušit polyline**: vzít max ~80 bodů (Mapbox Static URL má limit ~8 192 znaků; zakódovaná polyline pro 80 bodů se vejde s rezervou) — rovnoměrný downsample přes každý N-tý bod.
  3. Zakódovat pomocí Google Encoded Polyline algoritmu (precision 5) — krátká inline funkce, žádná nová závislost.
  4. Spočítat bounding box ze všech bodů → `auto` parametr v URL pro auto-fit.
  5. Sestavit URL:
     ```
     https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/
       path-3+7A6855-0.9({encodedPolyline}),
       pin-s+B7A99A({startLng},{startLat}),
       pin-s+2F333A({endLng},{endLat})
       /auto/640x360@2x?padding=20&access_token=...
     ```
  6. Nastavit `imgUrl` do state → vykreslit `<img src={imgUrl} alt="..." loading="lazy" decoding="async" />`.
- Stavy:
  - skeleton (jednoduchá animovaná pulsace v `bg-muted` během fetch+parse),
  - error fallback s **viditelným** textem (použít `text-foreground/70` na světlejším pozadí + ikonku),
  - `onError` na `<img>` přepne do error stavu (kdyby Mapbox vrátil 4xx kvůli příliš dlouhé URL).
- Žádný `mapbox-gl` import → výrazně menší bundle hit u stránky.
- Žádný `IntersectionObserver`, žádný cleanup mapy.

### Beze změny
- `src/pages/PruvodceBeskydy.tsx` — komponentu používá stejně.
- `src/data/beskydyRoutes.ts` — `gpxUrl` zůstává.
- GPX soubory v `public/gpx/beskydy/`.
- Přehledová interaktivní mapa `BeskydyOverviewMap.tsx` zůstává jak je (jediná na stránce, funguje).

## Technické detaily
- Token: stejný veřejný `pk.eyJ1IjoibWFraTA5OSI...` jako v `BeskydyOverviewMap`.
- Polyline encoder (~25 řádků): standardní algoritmus, žádný npm balík.
- Rozměry obrázku 640×360 @2x = ostré na běžných displejích, výška kontejneru zůstává 180 px (`object-cover`).
- Cachování: prohlížeč si statický PNG zacacheuje na svou TTL, takže opakované návštěvy jsou zdarma.
- SEO bonus: `<img alt>` dává sémantický popis trasy.

## Out of scope
- Interaktivní zoom/pan v mini náhledu (pokud bude třeba později, lze přidat odkaz „Otevřít interaktivní mapu" → samostatná modální mapa).
- Změny přehledové mapy.
- Změny GPX souborů.
