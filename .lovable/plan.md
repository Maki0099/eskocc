# Duplicity: chybné datum „načteno" a označování ve více dvojicích

## Zjištění 1 — proč má 189 jízd datum 1. 9. 2026

Všech 189 jízd má naprosto stejný časový údaj `1. 9. 2026 16:00:10`, přestože do databáze přibyly už v červenci a srpnu. Důvod: synchronizace při každém běhu přepíše u všech jízd, které Strava v klubovém přehledu stále nabízí, datum na aktuální čas běhu. Poslední takový běh proběhl 1. 9. 2026 v 16:00.

Důsledek: údaj „načteno" nevypovídá o ničem užitečném a hlavně rozbíjí detekci duplicit podle „stejného dne synchronizace" — 189 nesouvisejících jízd různých jezdců spadlo do jednoho dne.

## Zjištění 2 — proč se označilo víc jízd, než jste označil

V databázi jsou označené přesně 3 jízdy, tedy jen vaše volby. Ale jedna a tatáž jízda se v přehledu objevuje v mnoha dvojicích (jízda z 1. 9. je součástí 41 dvojic), takže po označení se tvářila jako „nepočítá se" úplně všude.

## Změny

### 1. Nepřepisovat datum při synchronizaci
`sync-club-activities` bude datum nastavovat jen u nově vkládaných jízd; u již existujících zůstane původní první načtení. Tím se datum ustálí a dál se nebude hromadně měnit.

### 2. Opravit už poškozená data
Jednorázově u jízd s hromadným datem `1. 9. 2026 16:00:10` nastavit datum podle skutečného prvního načtení (`created_at` daného záznamu). Tím se 189 jízd rozpadne zpět do reálných dnů.

### 3. Přehled duplicit — čitelnější seznam
- Dvojice, kde je aspoň jedna jízda už označená, zmizí z hlavního seznamu.
- Samostatná sekce „Označené jako duplicita" vypíše jednotlivé označené jízdy (každou jen jednou) s tlačítkem „Přece jen počítat".
- U nadpisu počet dvojic k rozhodnutí a počet označených jízd.
- U jízdy, která patří do více dvojic, drobný popisek „součástí dalších X dvojic".
- Popisek data změnit na „první načtení", aby bylo jasné, co číslo znamená.

## Technické detaily

- Edge funkce `supabase/functions/sync-club-activities/index.ts`: rozdělit upsert — nové řádky s `activity_date: syncedAt`, existující aktualizovat bez sloupce `activity_date` (např. nejprve načíst existující fingerprinty a pole `activity_date` a u nich zachovat původní hodnotu).
- Datová oprava: `UPDATE public.club_activities SET activity_date = created_at WHERE activity_date = '2026-09-01 16:00:10.856+00'` (189 řádků, žádné mazání).
- Frontend `src/components/admin/DuplicateActivitiesAdmin.tsx`: rozdělení výsledku RPC na otevřené dvojice a unikátní označené jízdy, mapa `id -> počet výskytů`, upravené popisky.
- Beze změny zůstávají `get_duplicate_activity_candidates()`, `set_activity_duplicate()` i přepočet statistik.
