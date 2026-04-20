
Cíl: V admin panelu → záložka Uživatelé přidat sloupec/indikátor, zda je uživatel napárovaný na atleta ze Strava klubu (tj. existuje záznam v `club_athlete_mappings` s `matched_user_id = user.id` a `ignored = false`).

## Co udělám

1. **Rozšířit `fetchUsers` v `src/pages/Admin.tsx`** — přidat dotaz na `club_athlete_mappings` (`select user_id, athlete_firstname, athlete_lastname_initial, ignored where matched_user_id is not null`) a do `UserWithRole` doplnit `clubAthlete?: { firstname, lastnameInitial } | null`.

2. **Přidat sloupec „Strava klub"** v tabulce uživatelů mezi „Role" a „Akce":
   - Pokud je napárovaný → zelený `Badge` s ikonou `Activity` a textem `Jan N.` (jméno atleta) + tooltip „Propojeno se Strava klub atletem".
   - Pokud není → šedý `Badge variant="outline"` s textem „Nepropojeno".
   - Skryté na mobilu (`hidden md:table-cell`) aby tabulka nepřetékala.

3. **Statistická karta** — přidat 5. kartu „Propojeno se Stravou" s počtem napárovaných uživatelů (úprava grid na `lg:grid-cols-5`).

## Technické detaily
- Mapping je 1:1 (jeden uživatel = jeden atlete-key v klubu), takže v paměti `Map<user_id, mapping>`.
- RLS: admin už má `ALL` policy na `club_athlete_mappings`, žádná migrace netřeba.
- Žádné změny v DB ani edge funkcích.

Soubory: pouze `src/pages/Admin.tsx`.
