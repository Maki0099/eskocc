

## Audit implementace klubového Strava sync — návrh vylepšení

Po projití `sync-club-activities`, `club-strava-callback`, `match-club-athlete`, `club-strava-auth` a `ClubStravaAdmin.tsx` jsem našel **kritické bugy** i řadu drobnějších vylepšení. Seřazeno podle závažnosti.

---

### 🔴 KRITICKÉ — opravit hned

**1. Špatné datum aktivity (rozbíjí YTD i deduplikaci)**
V `sync-club-activities` řádek 148 + 178: `activity_date` se nastavuje na `today` (čas běhu cronu), ne na skutečné datum aktivity ze Stravy. Strava Club Activities API sice nevrací `start_date`, ale to znamená, že:
- YTD počítá vše jako „letošní rok" (ok pro letos, ale na přelomu roku se YTD nikdy nereresetuje správně)
- Filtr `gte("activity_date", yearStart)` v praxi nikdy nevyřadí staré aktivity
- Sloupec ztrácí svůj význam

**Řešení:** Přejmenovat sémanticky na `synced_at` nebo zavést separátní `first_seen_at` (= kdy se objevila v sync) a YTD počítat přes `created_at` aktivity. Lepší: ukládat skutečné datum, kde to jde — Club API ho sice nedává, ale fingerprint by neměl obsahovat datum vůbec.

**2. Fingerprint založený na `today` = nefunguje deduplikace**
Řádek 156: `buildFingerprint(firstname, lastInit, today, distance)` → fingerprint obsahuje aktuální čas běhu, takže každý sync vytvoří **nové řádky** stejné aktivity. Tabulka `club_activities` rychle nabobtná duplicitami.

**Řešení:** Fingerprint = `firstname|lastInit|distance|moving_time|elevation_gain` (bez data). Strava Club API beztak nevrací ID, takže to je nejlepší dostupná identifikace. + UNIQUE index na `fingerprint`.

**3. YTD recalc nuluje uživatele bez aktivit**
V `sync-club-activities` řádek 222: iteruje jen přes uživatele, kteří MAJÍ aktivity v `totals`. Pokud někdo letos zatím neměl žádnou aktivitu (nebo se mu odpárovala atletská identita), zůstává mu starý YTD v `profiles`. Stejný problém v `match-club-athlete` při „Ignorovat" — předchozí user se reculcuje, ale pokud nemá žádnou aktivitu, dostane 0 — to je správně, ale prevent uživatele bez aktivit od resetu po novém roce.

**Řešení:** Před zápisem nulovat YTD všem členům, nebo přidat krok „nuluj YTD všem, kteří nejsou v `totals`".

---

### 🟠 STŘEDNÍ — funkční vady

**4. `club-strava-callback` ignoruje case kdy admin prošel přes preview URL**
Řádek 10–12: vždy fallbackuje na `eskocc.lovable.app`, což znamená, že admin přihlášený na vlastní doméně nebo preview URL po OAuth callbacku skončí jinde. Měl by se vracet na origin uložený ve `state` parametru.

**Řešení:** Do `state` přidat původ (`club_admin:{userId}:{returnTo_base64}`) a redirect tam.

**5. Žádný UNIQUE constraint na `athlete_key` ani `fingerprint`**
Kód používá `upsert` s `onConflict`, ale databáze nemá příslušné UNIQUE indexy → upsert může v race conditions selhat nebo vytvořit duplicity.

**Řešení:** Migrace přidá `UNIQUE(athlete_key)` na `club_athlete_mappings` a `UNIQUE(fingerprint)` na `club_activities`.

**6. `match-club-athlete` vstupní validace**
Žádná kontrola, že `user_id` je validní UUID nebo že daný user opravdu existuje v `profiles`. Admin si může omylem uložit nesmysl.

**Řešení:** Zod validace + ověření existence profilu před uložením.

**7. Cron frekvence vs. UI tvrzení**
UI v `ClubStravaAdmin.tsx` uvádí dvě protichůdné věty: jednou „Cron běží automaticky každou hodinu" (ř. 269), jindy „Cron má běžet každé 4 hodiny" (ř. 235). Reálnou frekvenci je třeba ověřit v `cron.job` a sjednotit text.

**Řešení:** Přečíst `get_cron_jobs()`, opravit text, případně srovnat schedule.

**8. Token refresh fail = ztichlá chyba**
`refreshIfNeeded` při neúspěchu hodí výjimku, která spadne jako 500. Admin nevidí, že token vypršel — alert v UI sice je, ale jen časový (>24h), nikoli reaktivní na konkrétní chybu refresh.

**Řešení:** Při 401 z refresh endpointu nastavit flag v `club_api_credentials.needs_reauth = true` a v UI explicitně zobrazit „Token byl odvolán, klikni Přepojit".

---

### 🟡 KVALITA / UX

**9. N+1 zápisy v sync loopu**
Řádky 169–185: pro každou aktivitu samostatný `upsert`. Při 200 aktivitách to je 200 round-tripů do DB → pomalé, plýtvá CPU edge function.

**Řešení:** Sebrat všechny řádky a udělat jeden batch `upsert` s polem objektů.

**10. N+1 v YTD recalc**
Řádky 222–230 a v `match-club-athlete` 109–127: pro každého uživatele samostatný UPDATE.

**Řešení:** Buď single SQL `UPDATE ... FROM (SELECT matched_user_id, SUM(distance_m), COUNT(*) ... GROUP BY)`, nebo databázová funkce `recalc_ytd_for_users(uuid[])` volaná z edge.

**11. Žádné logy syncu pro audit**
Není kde vidět historii: kolik aktivit přišlo, kolik bylo nových, kdy proběhl. UI ukazuje jen `created_at` poslední aktivity.

**Řešení:** Tabulka `club_sync_log` (id, started_at, finished_at, fetched, new_activities, new_athletes, error_message) + zobrazení v adminu posledních 10 běhů.

**12. UI: chybí akce „Smazat atleta" / „Sloučit dva atlety"**
Pokud Strava někoho zobrazí jednou jako „Petr N." a podruhé jako „Petr Novák" (změna nastavení privacy), vznikne duplicitní mapping. Není jak je sloučit.

**Řešení:** V tabulce atletů přidat dropdown akci „Sloučit s…" → přepsat `matched_user_id` na cíl, smazat zdroj, recalc.

**13. UI: filtr/search v tabulce atletů**
Při 50+ atletech je hledání nepárovaných obtížné. V kódu sice máš `unassigned` count v badge, ale není filtr „zobrazit jen nepřiřazené".

**Řešení:** Přidat tabs nebo toggle „Vše / Nepřiřazené / Ignorované".

**14. UI: nepoužité state**
`activities` list je v UI duplicita (poslední aktivity), ale s rozbitým `activity_date` ukazuje jen čas posledního syncu — málo užitečné. Buď zobrazit poslední skutečné syncy s časem syncu, nebo sekci úplně skrýt.

**15. Per-page limit je 200, používáš max 5 stránek, ale Strava reálně vrací max ~200 položek celkově**
Smyčka může být zjednodušena — `MAX_PAGES = 1` plně postačuje (a logy potvrzují, že přijde jen 50). Ušetří to retry overhead při výpadcích.

---

### 🔒 BEZPEČNOST

**16. `sync-club-activities` má `verify_jwt = false`** ale neověřuje vůbec nic
Kdokoli na internetu může spustit sync POST requestem. Není to destruktivní, ale plýtvá kvótou Strava API a může vyvolat rate limit.

**Řešení:** Buď přepnout na `verify_jwt = true` + admin role check (a cron volat se service-role JWT), nebo přidat shared-secret hlavičku, kterou cron pošle.

**17. `club-strava-callback` neověřuje, že OAuth state matchuje konkrétního admina**
State má formát `club_admin:{userId}`, ale kód jen ověří prefix. Měl by ověřit, že `userId` opravdu má roli `admin` v DB — jinak teoreticky kdokoli s admin OAuth scope může přebít klubové credentials.

---

## Doporučené pořadí implementace

```text
Fáze 1 (kritické bugy):           1, 2, 3, 5, 16
Fáze 2 (UX a viditelnost chyb):   8, 11, 7, 4
Fáze 3 (výkon):                   9, 10, 15
Fáze 4 (admin nástroje):          12, 13, 14, 6, 17
```

## Otázka pro tebe
Kterou fází (nebo konkrétními body) chceš začít? Doporučuji **Fáze 1** jako jeden balíček — bez ní YTD statistiky nemají správnou hodnotu a tabulka se zaplňuje duplicity.

