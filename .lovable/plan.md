# Proč se u Milana Holce ukazují jen 3 duplicity

## Co jsem ověřil v datech

Původních 7 skupin se našlo v době, kdy detekce porovnávala jízdy **podle podobných čísel** (vzdálenost, čas, převýšení). Potom jsme detekci zpřísnili tak, aby se porovnávaly jen jízdy **ze stejného dne**.

Jenže u dat staženýchz klubu není uložené skutečné datum jízdy — je tam čas, kdy záznam přibyl do aplikace. Po opravě, která tato data srovnala podle času vložení, se dvojice rozpadly do různých dnů.

Konkrétně u Milana: dvojice 60,7 × 60,9 km, 46,6 × 46,8 km, 47,5 × 47,4 km, 54,5 × 54,9 km, 50,5 × 50,4 km, 48,9 × 48,7 km a 32,2 × 32,1 km v databázi pořád jsou — ale jejich dva záznamy mají různá "data", takže je podmínka stejného dne vyřadí. Projdou jen 3 dvojice, kde datum náhodou vyšlo stejné.

## Návrh opravy

1. U starých klubových dat detekci **přestat vázat na stejný den** a vrátit porovnání podle podobnosti čísel: rozdíl vzdálenosti do 500 m, rozdíl času do 6 minut a rozdíl převýšení do 30 m nebo do 10 %. Tím se znovu objeví všech 7 skupin.
2. Datum u klubových záznamů v přehledu **označit jako „načteno"**, ne jako datum jízdy, aby bylo jasné, že se podle něj nedá párovat.
3. U nových dat z osobního propojení Stravy (kde skutečné datum jízdy je) **den ponechat** jako součást porovnání — tam je spolehlivý.
4. Už označené jízdy (3 kusy) zůstanou označené, nic se nepřepíše.

## Technické detaily

- Nová migrace přepíše `get_duplicate_activity_candidates()`: z JOIN se odstraní podmínka `a.activity_date::date = b.activity_date::date` a nahradí ji podmínky podobnosti (`abs(distance) <= 500`, `abs(moving_time) <= 360`, `sport_type` shodný); `likely_duplicate` zůstane dnešní přísnější test včetně převýšení. Řazení: `likely_duplicate DESC, athlete_full, distance DESC`.
- `get_member_duplicate_candidates()` (osobní jízdy) se nemění — tam je `activity_date` skutečné datum jízdy.
- `DuplicateActivitiesAdmin.tsx`: popisek data u klubových dvojic změnit na „načteno" a doplnit krátkou poznámku, že u klubových dat není k dispozici skutečné datum jízdy.
