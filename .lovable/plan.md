
Build error to fix: `NodeJS.Timeout` namespace v `ThemeProvider.tsx:118` (nahradit za `ReturnType<typeof setInterval>`).

Uživatel schválil všechny 4 volby pro přechod na Strava Club API. Plán implementace:

## 1. Oprava build erroru
`src/components/ThemeProvider.tsx` řádek 118: `NodeJS.Timeout` → `ReturnType<typeof setInterval>`.

## 2. Databázové změny (migrace)

**Nová tabulka `club_activities`**: id, athlete_firstname, athlete_lastname_initial, athlete_full (text pro match), matched_user_id (uuid → profiles, nullable), activity_date, distance_m, moving_time, elevation_gain, sport_type, fingerprint UNIQUE (firstname+lastname_initial+date+distance), created_at. RLS: members SELECT, admins ALL.

**Nová tabulka `club_api_credentials`** (single-row): access_token, refresh_token, expires_at, athlete_id, updated_at. RLS: jen admin SELECT/UPDATE; edge functions přistupují přes service role.

**Úpravy `profiles`**:
- Smazat: `strava_access_token`, `strava_refresh_token`, `strava_token_expires_at`, `strava_id`, `strava_monthly_stats`, `is_strava_club_member`
- Přidat: `club_match_name` (text)
- Vynulovat: `strava_ytd_distance = 0`, `strava_ytd_count = 0`, `strava_stats_cached_at = NULL`

**Úprava `get_member_statistics`** a `get_top_members`, `get_club_teaser_stats` — odstranit reference na smazané sloupce (`strava_id`, `is_strava_club_member`).

## 3. Edge functions

**Smazat**: `strava-auth`, `strava-callback`, `strava-stats`, `strava-stats-batch`. Smazat příslušné položky v `supabase/config.toml`.

**Nové**:
- `club-strava-auth` + `club-strava-callback` — jednorázový OAuth flow pro admina, callback uloží tokeny do `club_api_credentials` (vyžaduje admin role v state)
- `sync-club-activities` (cron 1×/h + manuální): načte/refreshne token z `club_api_credentials`, GET `/clubs/1860524/activities?per_page=200`, UPSERT do `club_activities` podle fingerprintu, auto-match nepárovaných (fuzzy: firstname + první písmeno příjmení vs `profiles.full_name`/`nickname`/`club_match_name`), přepočítá `profiles.strava_ytd_distance`/`count` z aktivit aktuálního roku.
- `match-club-activity` — admin endpoint pro ruční přiřazení `matched_user_id` jedné aktivitě + přepočet daného uživatele.

**Cron**: hodinový `sync-club-activities` přes pg_cron (insert tool, ne migrace).

## 4. Frontend změny

**Smazat soubory**: `src/components/dashboard/StravaConnectPrompt.tsx`, `src/components/register/StravaConnectStep.tsx`.

**Úpravy**:
- `src/components/register/RegistrationSteps.tsx` — odstranit Strava krok (jen osobní údaje + dokončit)
- `src/pages/Account.tsx` — odebrat sekci propojení Stravy; přidat input "Mé jméno na Stravě klubu" (`club_match_name`)
- `src/pages/Dashboard.tsx` — odstranit `<StravaConnectPrompt>`
- `src/pages/MemberProfile.tsx` — odstranit detailní Strava sekci, ponechat jen YTD
- `src/components/dashboard/StravaWidget.tsx` — číst pouze YTD z `profiles` (žádné API volání), zobrazit "data z klubu ESKO.cc"
- `src/hooks/useUserStats.ts` — odstranit `strava_id`, `is_strava_club_member` reference
- `src/components/strava/StravaClubBanner.tsx` — smazat nebo přepracovat (členství už netrackujeme per-user)
- `src/pages/Admin.tsx` — nová záložka **"Strava klub"**: status připojení, tlačítko "Propojit klubový účet" (OAuth admina), tlačítko "Sync teď", seznam nepárovaných aktivit s dropdown výběrem uživatele.

## 5. Pořadí prací

1. Oprava `NodeJS.Timeout` (odblokuje build)
2. DB migrace (tabulky + úpravy profiles + úpravy RPC funkcí)
3. Smazat staré edge funkce + úprava `config.toml`
4. Vytvořit nové edge funkce (`club-strava-auth`, `club-strava-callback`, `sync-club-activities`, `match-club-activity`)
5. Cron job (insert tool)
6. Frontend úklid (smazat komponenty, upravit registraci/account/dashboard/profile)
7. Admin záložka "Strava klub"

## Co od tebe potřebuji po schválení
- Po deployi otevři `/admin` → záložka **Strava klub** → "Propojit klubový účet" a propojí se tvým existujícím Strava účtem (musíš být členem klubu ESKO.cc, aby token měl přístup k aktivitám klubu).
- Stávající `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` zůstávají (Personal-use limit 1 atleta nám stačí — propojí se jen jeden admin).
