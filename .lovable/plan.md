

## Otázka: "Connect Strava to pull member activities into the events page and gallery highlights"

### Krátká odpověď
**Z velké části už to máš.** Jen není povrchově vidět na `/events` a `/galerie`. Stačí ty existující data (která už taháme přes `sync-club-activities` cron každých 24h) **vystavit** v UI jako dvě nové sekce. Žádný nový OAuth, žádné nové API permissions.

### Co už dnes funguje v pozadí
- **Klubový OAuth** (`club_api_credentials`) — admin propojený jednorázově se Stravou.
- **Cron 24h** (`sync-club-activities`) — stahuje až 200 nejnovějších klubových aktivit.
- **`club_activities` tabulka** — fingerprint, jméno, distance, čas, převýšení, sport, datum, `matched_user_id` (mapováno na našeho usera přes `club_athlete_mappings`).
- **YTD agregace** — `recalc_club_ytd()` plní `profiles.strava_ytd_distance/count`, dnes využité jen na `/statistiky` a v homepage teaseru.

**Co Strava klubový endpoint NEvrací:** fotky, GPS trasu (polyline) ani odkaz na konkrétní aktivitu. To je hard limit Strava API — pro fotky/polyline by musel **každý člen** propojit svůj osobní Strava účet (= jiný projekt, viz sekce „Co NENÍ realistické").

---

### Co reálně postavíme

#### 1. „Nedávné klubové jízdy" sekce na `/events`
Nový blok mezi „Nadcházející" a „Historie" tabem (nebo jako třetí tab **„Nedávné jízdy"**):
- Posledních 14 dní aktivit z `club_activities`, seskupeno podle dne.
- Karta jízdy: jméno člena (klikatelné na `/member/:userId` pokud `matched_user_id` existuje, jinak jen text), sport ikona (silnička/MTB/gravel/run), distance, čas, převýšení, relativní čas („před 2 dny").
- Filter pill: **Vše / Silnice / MTB / Gravel** (podle `sport_type`).
- Zobrazí se členům (`member`/`active_member`/`admin`) — RLS už to umožňuje.

#### 2. „Highlights týdne" widget v `/galerie`
Banner nahoře nad tabbed galerií:
- **Top 3 jízdy minulého týdne** podle distance (z `club_activities` WHERE `activity_date >= now()-7d`).
- Karty: jméno + iniciála, distance, převýšení, datum, sport.
- Plus jeden „leaderboard chip" — kdo má nejvíc km za posledních 7 dní celkově.
- Cíl: galerie přestane být jen statická fotka-grid, dostane „život klubu".

#### 3. Manuální „Sync teď" tlačítko
V adminu (Strava klub tab) už existuje. Přidat ho i do Dashboardu pro adminy, aby nemuseli do `/admin` (drobný UX bonus, žádná nová logika).

---

### Co NENÍ realistické (a proč)

| Požadavek | Proč to nejde |
|---|---|
| Fotky z aktivit členů v galerii | Strava klubový endpoint fotky nevrací. Per-user OAuth + scope `activity:read_all` by teoreticky šel, ale Strava App je momentálně omezená na 1 athlete (viz mem `strava-api-app-misconfiguration`). |
| GPS trasa konkrétní jízdy na mapě | Stejný důvod — `polyline` chybí v klubovém endpointu. |
| Real-time push „Petr právě dojel 80 km" | Strava neposkytuje webhooks pro klubové aktivity. Max co můžeme = 24h cron + manuální sync. |
| Aktivity starší než ~200 nejnovějších | Strava klubový endpoint vrací jen poslední stránku (~200). Historie před tím je nedostupná. |

---

### Soubory

**Nové:**
- `src/components/events/RecentClubActivities.tsx` — sekce/tab s posledními aktivitami
- `src/components/gallery/WeeklyHighlights.tsx` — banner top 3 jízd v galerii
- `src/lib/sport-type-utils.ts` — mapování `sport_type` → ikona + lokalizovaný název (silnička/MTB/gravel/běh/…)

**Upravené:**
- `src/pages/Events.tsx` — nový tab „Nedávné jízdy" (member-only)
- `src/pages/Gallery.tsx` — `<WeeklyHighlights />` nad tabbed obsah
- `src/components/dashboard/StravaWidget.tsx` (nebo nová karta) — admin „Sync teď" shortcut

**Beze změny:**
- Edge funkce, DB schema, cron, RLS — vše už je hotové a funguje.

---

### Technická poznámka
Dotaz pro „nedávné jízdy" bude jednoduchý:
```ts
supabase.from("club_activities")
  .select("*, profiles:matched_user_id(id, full_name, nickname, avatar_url)")
  .gte("activity_date", subDays(new Date(), 14).toISOString())
  .order("activity_date", { ascending: false })
  .limit(50);
```
Foreign key `matched_user_id → profiles(id)` v DB chybí (tabulka nemá FK), takže join udělám přes ruční dotaz na `profiles` IN (...ids) a mapping client-side. Žádná migrace.

