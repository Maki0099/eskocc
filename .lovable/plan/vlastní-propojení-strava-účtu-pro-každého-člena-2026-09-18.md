# Vlastní propojení Strava účtu pro každého člena

Strava od 1. 9. 2026 zrušila hromadné stahování klubových jízd. Nově si každý člen
propojí svůj Strava účet sám a aplikace stahuje data přímo z jeho účtu — jak roční
souhrn, tak jednotlivé jízdy, aby dál fungoval graf průběhu sezóny i kontrola duplicit.

## Co uvidí člen

- V nastavení účtu tlačítko „Propojit Strava účet" (už existuje), po propojení se
  hned stáhnou jeho data.
- Na nástěnce a ve statistikách výzva „Propoj si Stravu", dokud propojení nemá.
- Ve statistikách u nepropojených členů místo čísel stav „nepropojeno" s výzvou,
  aby si účet propojili — aby bylo jasné, že jejich čísla nejsou zastaralá, ale chybí.
- Graf průběhu sezóny a osobní karty (km, počet jízd, převýšení) se plní z jeho účtu.

## Co uvidí správce

- V administraci přehled: kdo je propojený, kdy naposledy proběhlo stažení,
  u koho propojení vypršelo, plus tlačítko pro okamžité stažení pro všechny.
- Stará klubová synchronizace zůstane vypnutá s vysvětlující hláškou.

## Technické kroky

1. **Nová tabulka `member_activities`** (per-uživatel, unikátní `strava_activity_id`):
   datum jízdy, vzdálenost, čas, převýšení, typ sportu, `excluded_as_duplicate`.
   GRANT + RLS: čtení vlastních řádků pro `authenticated`, plný přístup `service_role`.
   Na rozdíl od `club_activities` obsahuje skutečné datum jízdy ze Stravy.
2. **Nová edge funkce `sync-member-activities`**: pro každý propojený účet stáhne
   `athlete/activities` od začátku roku (stránkovaně, s ohledem na limity Stravy),
   upsertne do `member_activities`, obnoví token přes refresh token, při odvolání
   nastaví `needs_reauth`. Autorizace: cron (hlavička), service role, admin
   (pro kohokoli), člen (jen pro sebe).
3. **Přepočet statistik**: funkce `recalc_member_ytd()` spočítá km, počet jízd
   a převýšení z `member_activities` (bez označených duplicit) a zapíše je do
   `profiles.strava_ytd_*`, aby zbytek aplikace (statistiky, teaser, top členové)
   fungoval beze změny. Zdroj dat pro členy bez propojení = 0 + příznak „nepropojeno".
4. **`get_member_statistics`** doplní sloupec `is_connected`; `get_member_yearly_progress`
   bude číst z `member_activities` s pravým datem jízdy.
5. **`strava-stats-batch`** doplní i převýšení (`personal_ytd_elevation`), aby
   souhrn ze Stravy seděl s výpočtem z jízd.
6. **Cron**: denní běh `sync-member-activities` (např. 3:30) + stávající
   `daily-strava-stats-update` zůstává. Doplnit chybějící záznamy funkcí
   `user-strava-auth`, `user-strava-callback`, `strava-stats-batch`,
   `sync-member-activities` do `supabase/config.toml`.
7. **Frontend**: karta propojení zůstává v nastavení účtu; výzva na nástěnce
   a ve statistikách; sloupec stavu v přehledu statistik; admin komponenta
   „Strava členů" (přehled propojení + ruční spuštění).
8. **Duplicity**: detekce se přesune na `member_activities` (stejný člen, stejný
   skutečný den jízdy) — díky pravému datu bude výrazně přesnější než dosud.

## Omezení k ověření

Vývojářská aplikace Stravy je zatím v režimu pro omezený počet sportovců
(aktuálně propojeni 2 z 13 členů). Aby se mohli propojit všichni, je nutné
u Stravy schválit navýšení limitu — bez toho další členové při propojení narazí
na chybu. Kód bude připravený, limit řeší žádost u Stravy.
