## Cíl
Ke každé z 6 beskydských tras v sekci „Doporučené trasy" (na `/pruvodce-beskydy`, GPX soubory leží v `public/gpx/beskydy/`) přidat malý interaktivní náhled trasy na mapě nad tlačítkem „Stáhnout GPX", aby si uživatel mohl ověřit průběh ještě před stažením.

## Co vznikne

### 1. Nová komponenta `src/components/map/RouteGpxPreview.tsx`
- Props: `gpxUrl: string`, `title: string`, volitelně `className`.
- Lazy-loaded `mapbox-gl` (stejný token jako v `BeskydyOverviewMap.tsx`).
- Lifecycle:
  1. `IntersectionObserver` – mapa se inicializuje až když je náhled blízko viewportu (úspora výkonu při 6 mapách na stránce).
  2. `fetch(gpxUrl)` → `DOMParser` (`text/xml`) → vytáhnout všechny `<trkpt lat lon>` → pole `[lng, lat]`.
  3. Vykreslit jako GeoJSON `LineString` (vrstva `line`, barva `--primary` `#B7A99A`, šířka 3 px).
  4. `map.fitBounds(bounds, { padding: 16 })` podle krajních bodů.
  5. Přidat start/cíl markery (malé tečky barvou `--accent`).
- Interakce: `scrollZoom.disable()`, `dragPan` povoleno, malý `NavigationControl` (zoom +/-) vpravo nahoře.
- Výška ~180 px, plná šířka karty, zaoblené rohy, jemný border odpovídající designu karet.
- Stavy: skeleton (před načtením), fallback hláška „Náhled mapy se nepodařilo načíst" při chybě fetch/parse – tlačítko GPX zůstává funkční.
- Cleanup `map.remove()` v unmount.

### 2. Úprava `src/pages/PruvodceBeskydy.tsx`
- Import `RouteGpxPreview`.
- V kartě každé trasy (kolem řádku 270–285) vložit `<RouteGpxPreview gpxUrl={r.gpxUrl} title={r.title} />` mezi popis trasy a řádek s tlačítky Stáhnout GPX / Mapy.cz / Komoot.
- Beze změny dat (`beskydyRoutes.ts`) – GPX URL už existuje na každém záznamu.

## Technické detaily
- Mapbox je už v projektu (`mapbox-gl` + CSS importováno v `BeskydyOverviewMap`), žádná nová závislost.
- Token zůstává inline stejně jako ve stávající mapě (konzistence).
- GPX parsing čistě v prohlížeči přes nativní `DOMParser` – žádná nová knihovna.
- Soubory v `public/gpx/beskydy/*.gpx` jsou statické, fetch je same-origin, žádné CORS řešení.
- Performance: max 6 map, init až při scrollu; `preserveDrawingBuffer: false`, `attributionControl: true` (Mapbox vyžaduje).

## Out of scope
- Profil převýšení u každé trasy (řešit samostatně, pokud bude potřeba).
- Změny stávající přehledové mapy nahoře stránky.
- Změny GPX souborů samotných.
