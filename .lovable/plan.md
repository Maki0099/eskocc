# Klikatelné trasy na mapě klubu

Na mapě klubu půjde kliknout na konkrétní trasu (nebo na její startovní bod). Vybraná trasa se zvýrazní a otevře se její detail — stejný, jaký je dnes v sekci Trasy na profilu člena.

## Co uvidí uživatel

- **Kliknutí na trasu nebo značku startu** vybranou jízdu zvýrazní: silnější a plně sytá čára, ostatní trasy zesvětlí do pozadí. Kurzor se nad trasou změní na ruku.
- **Panel s detailem** se objeví pod mapou (na mobilu nad legendou): jméno člena, název jízdy, datum, vzdálenost, převýšení a čas.
- **Tlačítko „Zobrazit trasu"** otevře stejné okno s velkou interaktivní mapou jako v sekci Trasy, včetně tlačítka **Stáhnout GPX**.
- **Tlačítko „Stáhnout GPX"** přímo v panelu, aby šlo stáhnout bez otevírání okna.
- **Odkaz na profil člena**, kterému jízda patří.
- Kliknutí mimo trasu nebo tlačítko „Zrušit výběr" zvýraznění zruší.
- Virtuální jízdy (Zwift) se chovají stejně, jen si zachovají modrou barvu a přerušovanou čáru.

## Technická část

**Databáze** — rozšířit `get_club_activity_polylines(_days)` o sloupce `id` (id jízdy z `member_activities`), `name`, `elevation_gain` a `moving_time`. Funkce zůstává SECURITY DEFINER, EXECUTE jen pro `authenticated`.

**Sdílený detail trasy** — z `src/components/member/MemberRoutes.tsx` vyčlenit dialog s mapou do nové komponenty `src/components/member/RouteDetailDialog.tsx` (mapa Mapbox GL + stažení GPX přes `coordsToGpx`/`downloadGpx` z `src/lib/polyline.ts`). MemberRoutes ji začne používat, aby existovala jen jedna implementace.

**`src/pages/ClubMap.tsx`**
- Do GeoJSON features přidat `id` jízdy a ostatní metadata; stav `selectedId`.
- Nová vrstva `route-lines-selected` s filtrem na `selectedId` (line-width 5, plná krytí); stávající vrstvy při aktivním výběru ztlumit (`line-opacity` menší).
- `map.on("click", "route-lines-layer" | "route-lines-virtual-layer", …)` a klik na značku startu nastaví `selectedId`; `mouseenter`/`mouseleave` přepínají `cursor: pointer`; klik do prázdné mapy výběr zruší.
- Panel s detailem renderovaný pod mapou z vybrané aktivity, tlačítka otevřou `RouteDetailDialog` nebo rovnou stáhnou GPX.
