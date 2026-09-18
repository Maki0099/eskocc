# Duplicity — přidat převýšení do vyhodnocení

## Cíl

Příznak „Pravděpodobná duplicita" v záložce Administrace → Duplicity bude nově zohledňovat i nastoupané převýšení, ne jen vzdálenost a čas jízdy.

## Současný stav (ověřeno)

- Dvojice se hledají podle stejného jezdce + stejného data synchronizace.
- `likely_duplicate` = rozdíl vzdálenosti ≤ 500 m a času ≤ 360 s.
- Rozdíl převýšení se už zobrazuje, ale na hodnocení nemá vliv.

## Změny

### 1. Databáze — `get_duplicate_activity_candidates()`

- Do podmínky `likely_duplicate` přidat kontrolu převýšení: rozdíl ≤ 30 m **nebo** ≤ 10 % vyšší hodnoty.
- Tolerance je záměrně volnější než u vzdálenosti — dvě Garmin zařízení měří výšku jinak (barometr vs. GPS), typický rozdíl u skutečných duplicit je v desítkách metrů.

### 2. Administrace — popisek

- U badge „Pravděpodobná duplicita" doplnit, že hodnocení zahrnuje vzdálenost, čas i převýšení.
- Zobrazení rozdílů a ovládání se nemění.

### 3. Ověření

- Dotazem zkontrolovat, kolik dvojic zůstane označených jako pravděpodobné (dnes 13) a že známé případy (Martin H. 41,9 km, Zbyněk K. 97,5 km) označené zůstanou.
- Zkontrolovat build.

## Technické detaily

- Migrace: `CREATE OR REPLACE FUNCTION public.get_duplicate_activity_candidates()` — rozšíření výpočtu `likely_duplicate` o podmínku převýšení.
- Frontend: `src/components/admin/DuplicateActivitiesAdmin.tsx` — pouze text popisku.