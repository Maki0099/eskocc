# Duplicity: označená jízda se objevuje ve více dvojicích

## Co se opravdu stalo

V databázi jsou označené přesně 3 jízdy — tedy jen ty, které jste označil. Nic navíc se neoznačilo.

Problém je v zobrazení: stejná jízda se v přehledu objevuje v mnoha dvojicích. Jízda z 1. 9. je například součástí 41 různých dvojic (všechny jízdy Milana H. z téhož dne synchronizace se navzájem kombinují). Jakmile ji označíte, ukáže se jako „nepočítá se" ve všech 41 dvojicích — vypadá to, jako by se označilo víc jízd.

## Úprava přehledu

1. **Skrýt už vyřešené dvojice** — dvojice, kde je aspoň jedna jízda označená jako duplicita, se z hlavního seznamu odstraní. Zůstanou jen dvojice, kde je ještě potřeba rozhodnout.
2. **Samostatný seznam „Označené jako duplicita"** — sbalitelná sekce se seznamem jednotlivých označených jízd (ne dvojic), každá jen jednou, s tlačítkem „Přece jen počítat".
3. **Počítadla** — u nadpisu počet dvojic k rozhodnutí a počet už označených jízd.
4. **Upozornění u dvojice** — pokud se jízda z dvojice objevuje i v dalších dvojicích, u ní bude drobný popisek „součástí dalších X dvojic", aby bylo jasné, proč zmizí víc řádků najednou.

## Technické detaily

- Změna jen ve frontendu: `src/components/admin/DuplicateActivitiesAdmin.tsx`.
- Rozdělení výsledku RPC na `openPairs` (obě jízdy neoznačené) a `excludedActivities` (unikátní podle `id`, sesbírané z `a_*`/`b_*` polí).
- Počet výskytů jízdy spočítat v paměti z vrácených dvojic (mapa `id -> počet`).
- Bez migrace, bez změny `get_duplicate_activity_candidates()`, `set_activity_duplicate()` ani přepočtu statistik.
