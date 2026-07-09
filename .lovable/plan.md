## Cíl
Do stránky profilu člena (`/member/:userId`) přidat graf zobrazující, jak členovi rostly najeté kilometry v průběhu aktuálního roku.

## Vizuální podoba
- Nová karta „Průběh sezóny {rok}" pod kartou „Statistiky tohoto roku".
- Plošný / spojnicový graf (recharts, `AreaChart`) v barvě primary.
- Osa X = měsíce (Led–Pro), osa Y = kumulativní km od 1.1.
- Tooltip: datum + kumulativní km + km za daný den.
- Prázdný stav: hláška „Zatím žádné aktivity v tomto roce."
- Skeleton při načítání.

## Datový zdroj
Tabulka `club_activities` už obsahuje `matched_user_id`, `activity_date` a `distance_m` – všechny aktivity členů z klubového Strava účtu za rok. Data zagregujeme po dnech a spočítáme běžící součet.

## Backend
Nová SECURITY DEFINER funkce `get_member_yearly_progress(_user_id uuid)`:
- Přístupná pouze přihlášeným členům (`has_role` member/active_member/admin), stejně jako `get_member_statistics`.
- Vrací řádky `(day date, day_km numeric, cumulative_km numeric)` pro aktuální rok.
- Interně: `SUM(distance_m)/1000` po `date_trunc('day', activity_date)` s window funkcí pro kumulativní součet.
- GRANT EXECUTE na `authenticated`.

## Frontend
- Nová komponenta `src/components/member/YearlyProgressChart.tsx`:
  - Props: `userId`.
  - Načte data přes `supabase.rpc('get_member_yearly_progress', { _user_id })`.
  - Vykreslí `ResponsiveContainer` + `AreaChart` z `recharts` (už v projektu).
  - Doplní bod pro 1.1. (0 km) a případně pro dnešek, aby graf pokrýval celý rok.
  - České formátování (`cs-CZ`), měsíční ticky.
- V `src/pages/MemberProfile.tsx` importovat a vložit pod kartu YTD statistik.

## Rozsah dat / omezení
- Graf ukazuje pouze aktivity zaznamenané v klubovém Strava účtu (stejný zdroj jako YTD čísla). To zmíníme malým popiskem pod grafem, konzistentně s existující kartou.
- Členové bez napárovaných aktivit v roce → prázdný stav.

## Technická poznámka
Zvážit doplnění indexu `club_activities (matched_user_id, activity_date)` pokud tam ještě není – zrychlí dotaz. Ověřím při implementaci.
