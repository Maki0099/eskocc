# Vyhodnocení duplicit podle dne synchronizace

## Cíl
V administraci zobrazit jízdy stejného jezdce, které byly synchronizovány ve stejný den — typický případ nahrání stejné trasy ze dvou zařízení (např. dvě Garmin zařízení), kdy obě jízdy dorazí do databáze v jedné dávce.

## Změny

### 1. Databáze — úprava funkce `get_duplicate_activity_candidates()`
- Dvojice se nově hledají takto: **stejný jezdec + stejné datum synchronizace** (`activity_date::date`), obě jízdy ≥ 1 km.
- Podmínky vzdálenosti a času se z podmínek výběru odstraní — místo toho funkce spočítá rozdíly a příznak `likely_duplicate` (shoda vzdálenosti ≤ 50 m a času ≤ 60 s), aby bylo poznat, která dvojice je téměř jistá duplicita.
- Výstup seřadí: nejdřív „pravděpodobné duplicity", pak podle jezdce a data.
- Přístup zůstává pouze pro administrátory.

### 2. Administrace — záložka „Duplicity"
- Nadpis/popisek upraven: „Jízdy stejného jezdce synchronizované ve stejný den".
- U každé dvojice zůstane zobrazený rozdíl vzdálenosti, času a převýšení + badge „Pravděpodobná duplicita".
- Protože stejný den synchronizace může znamenat i dvě skutečné jízdy (ráno/večer), zůstává rozhodnutí na adminovi — ovládání „Označit jako duplicitu" / „Přece jen počítat" se nemění.

### 3. Ověření
- Dotazem ověřit počet nalezených dvojic a zkontrolovat, že se mezi nimi objevují známé případy.
- Zkontrolovat build.

## Technické detaily
- Migrace: `DROP FUNCTION` + `CREATE FUNCTION public.get_duplicate_activity_candidates()` (změna podmínek spárování na `a.activity_date::date = b.activity_date::date`).
- Frontend: `src/components/admin/DuplicateActivitiesAdmin.tsx` — pouze úprava popisků, logika zobrazení zůstává.
- Bez změny ukládání i přepočtu statistik.
