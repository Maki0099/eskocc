# Osobní Strava napojení pro členy (paralelně vedle klubové sync)

## Cíl
Každý člen volitelně propojí svůj osobní Strava účet → získáme přesné YTD statistiky z `/athletes/{id}/stats`. Klubová sync (`sync-club-activities` + `recalc_club_ytd`) zůstává **plně funkční a nedotčená**. Obě hodnoty se ukládají do **oddělených sloupců** a v UI se zobrazují **vedle sebe**, dokud nepotvrdíme spolehlivost nové cesty.

## Klíčové rozhodnutí: dvě sady sloupců, žádné přepisování

| Sloupec | Zdroj | Plní |
|---|---|---|
| `profiles.strava_ytd_distance` (stávající) | klubový feed `/clubs/.../activities` | `recalc_club_ytd()` (nedotčeno) |
| `profiles.strava_ytd_count` (stávající) | klubový feed | `recalc_club_ytd()` (nedotčeno) |
| `profiles.personal_ytd_distance` (**nový**) | `/athletes/{id}/stats` | `strava-stats-batch` (nový) |
| `profiles.personal_ytd_count` (**nový**) | `/athletes/{id}/stats` | `strava-stats-batch` (nový) |
| `profiles.personal_stats_cached_at` (**nový**) | nightly cron | `strava-stats-batch` |

Žádný kód se „neuškrtí" — staré hodnoty zůstanou tam, kde byly, a nová cesta jen přidá další pole.

## Co se postaví

### 1. Migrace databáze
- Nová tabulka `user_strava_tokens` (user_id PK, athlete_id, access_token, refresh_token, expires_at, scope, needs_reauth, last_error, last_synced_at, časové značky). RLS: uživatel čte/maže jen svůj záznam, admin čte vše, service_role plný přístup. GRANT pro `authenticated` a `service_role`.
- ALTER `profiles` ADD COLUMN `personal_ytd_distance int`, `personal_ytd_count int`, `personal_stats_cached_at timestamptz`.

### 2. Edge funkce (3 nové, žádná existující se neupravuje)
- **`user-strava-auth`** — vrátí OAuth authorize URL pro přihlášeného uživatele (scope `read,activity:read,profile:read_all`, state = `member:<userId>:<returnTo>`). Vzor: `club-strava-auth`.
- **`user-strava-callback`** — výměna kódu za tokeny, upsert do `user_strava_tokens`, redirect na `/ucet?strava=connected`. Vzor: `club-strava-callback`.
- **`strava-stats-batch`** — pro každého uživatele s tokenem: refresh pokud expiruje → `GET /athletes/{athlete_id}/stats` → UPDATE `profiles.personal_ytd_*`. Sekvenčně + drobné delay (Strava limit 100/15 min). Autorizace stejně jako `sync-club-activities`: header `x-trigger-source: pg-cron` nebo service_role nebo admin JWT. Log do `club_sync_log` s `triggered_by='member-stats-cron'`.

### 3. Cron
- Stávající cron `daily-strava-stats-update` (který teď 404-uje) přesměrovat na novou `strava-stats-batch` s headerem `x-trigger-source: pg-cron`. Frekvence 1×/den (ráno). Klubová sync (každé 4 h) zůstává.

### 4. UI změny — minimální a izolované

**`src/pages/Account.tsx`** — nová sekce „Můj Strava účet":
- Nepřipojeno → tlačítko „Propojit Strava účet" → `user-strava-auth`
- Připojeno → zobrazit `athlete_id`, `last_synced_at`, tlačítka „Synchronizovat teď" (spustí `strava-stats-batch` pro daného usera) a „Odpojit" (DELETE řádku z `user_strava_tokens`)
- `needs_reauth=true` → varování + „Přepojit"

**`src/hooks/useUserStats.ts`** — rozšířit o `personalYtdDistance`, `personalYtdCount`, `personalStatsCachedAt` (přečíst nové sloupce). **Žádná stávající hodnota se nemění.**

**`src/components/dashboard/StravaWidget.tsx`** a `src/pages/Statistics.tsx` (a `src/pages/MemberProfile.tsx`) — zobrazit obě hodnoty vedle sebe:
- „Klubový feed: X km / Y jízd"  
- „Osobní Strava: X km / Y jízd" (pouze pokud je účet propojen, jinak skryto)
- Drobná legenda/tooltip s vysvětlením rozdílu

### 5. Strava developer dashboard
Přidat **druhou** Authorization Callback URL pro `user-strava-callback` (vedle stávající `club-strava-callback`). Reuse `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` — žádné nové secrets.

## Zpětná kompatibilita — co se **NEMĚNÍ**
- `sync-club-activities` (kód, schedule, výstupy) — beze změny
- `recalc_club_ytd()` — beze změny, plní `strava_ytd_*` jako dosud
- `profiles.strava_ytd_distance` / `strava_ytd_count` — beze změny
- `club_api_credentials`, `club_activities`, `club_athlete_mappings` — beze změny
- Všechny existující komponenty, které čtou `strava_ytd_*`, fungují dál

## Ověření před přepnutím (budoucí krok, mimo tento plán)
Až bude jasné, že `personal_ytd_*` ≥ `strava_ytd_*` u všech propojených členů a cron běží stabilně několik dní, dojde k odděleně schválenému kroku: změnit primární zdroj zobrazení na „personal s fallbackem na club". To **není** součástí tohoto plánu.

## Technický flow

```text
Propojení:
  /ucet → "Propojit" → user-strava-auth → strava.com → user-strava-callback
                                                       → upsert user_strava_tokens
                                                       → redirect /ucet?strava=connected

Nightly:
  pg_cron 1×/den → strava-stats-batch (header x-trigger-source: pg-cron)
                  → for each user_strava_tokens row:
                        refreshIfNeeded()
                        GET /athletes/{id}/stats
                        UPDATE profiles SET personal_ytd_distance, personal_ytd_count, personal_stats_cached_at
                  → log do club_sync_log

UI:
  Dashboard / Statistiky / MemberProfile
     ┌──────────────────────┐ ┌───────────────────────┐
     │ Klubový feed         │ │ Osobní Strava         │
     │ 1 234 km / 42 jízd   │ │ 1 580 km / 51 jízd    │
     └──────────────────────┘ └───────────────────────┘
        (vždy)                   (jen pokud propojeno)
```

## Otevřené otázky před implementací
1. Po stisku „Propojit" má proběhnout **okamžitý** první sync (lepší UX), nebo počkat na nightly cron?
2. Má být tlačítko „Synchronizovat teď" v `/ucet` dostupné i běžnému členovi (s rate-limitem např. 1× za hodinu), nebo jen adminovi?
