## Problém

V žebříčku `Statistics.tsx` se zobrazuje `full_name || nickname || "Bez jména"`. U členů, kteří mají v `profiles` prázdné `full_name` (typicky proto, že se registrovali dřív nebo že jim Strava OAuth přepsala/nedoplnila jméno), padne zobrazení na `nickname` — a ten často pochází ze Stravy. Odtud ten „mix" plných jmen a přezdívek.

## Cíl

V žebříčku a v exportu vždy ukazovat **plné jméno z registrace** (`profiles.full_name`), nikdy Strava nickname. Nickname zůstane jako doplňkový údaj na profilu, ale nebude náhradou jména v seznamech.

## Kroky

1. **Datová oprava (SQL, jednorázově)**
   - Najít členy s prázdným `full_name` a doplnit z metadat `auth.users.raw_user_meta_data->>'full_name'` (tam, kde existuje z registrace).
   - Pro zbytek (registrovaní bez jména) nechat `full_name` jak je — bude řešeno UI hláškou, ne fallbackem na nickname.

2. **Zamezit budoucím prázdným hodnotám**
   - V `handle_new_user()` trigger už `full_name` bere z metadat — ok. Přidat CHECK/normalizaci: pokud přijde prázdný string, zapsat `NULL` (aby bylo snadno detekovatelné).
   - `normalize_full_name()` trigger už kapitalizuje — necháme.

3. **Frontend — `src/pages/Statistics.tsx`**
   - Změnit zobrazované jméno v řádku žebříčku z `member.full_name || member.nickname || "Bez jména"` na jen `member.full_name || "Bez jména"`.
   - Stejně tak upravit alt/title a případné další seznamy členů, kde se nickname používá jako fallback (zkontrolovat `ClubSummaryStats`, `MemberProfile`, dashboard widgety — kde je to seznam, ne detail profilu).
   - `getInitials()` může nickname dál používat jen jako fallback pro avatar iniciály (kosmetika), to nezpůsobuje záměnu.

4. **Ověření**
   - Po migraci projít SQL kontrolu: `SELECT id, full_name, nickname FROM profiles WHERE full_name IS NULL OR full_name = '';` — pokud někdo zůstane, admin doplní ručně přes Účet.
   - Vizuálně ověřit v `/statistiky` na mobilu i desktopu, že žádný řádek neukazuje Strava přezdívku.

## Dotčené soubory

- SQL migrace (backfill `full_name` z `auth.users.raw_user_meta_data`)
- `src/pages/Statistics.tsx` (odstranit nickname fallback)
- `src/components/statistics/ClubSummaryStats.tsx` (kontrola/úprava, pokud používá nickname)
- ostatní seznamy členů — jen pokud stejný fallback najdu

Chceš, abych to takto provedl? Případně: pokud u některých členů skutečně chybí registrační jméno a nechceš „Bez jména", můžeme místo toho použít e-mailový alias před `@` — dej vědět.
