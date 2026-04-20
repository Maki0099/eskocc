
Cíl: nahradit per-activity párování za **trvalé propojení Strava atleta ↔ člen klubu**. Jakmile admin spáruje "Jan N." s členem, všechny jeho minulé i budoucí aktivity se napárují automaticky.

## Klíčový vhled
Strava Club API neposkytuje stabilní `athlete_id` u klubových aktivit (jen `firstname` + `lastname` initial). Identitu atleta tedy musíme reprezentovat **kombinací `firstname + lastname_initial`** (např. "Jan|N").

## Návrh

### 1. Nová tabulka `club_athlete_mappings`
```
id uuid pk
athlete_key text unique  -- normalizovaný "jan|n"
athlete_firstname text
athlete_lastname_initial text
matched_user_id uuid (nullable)  -- null = explicitně ignorováno
created_at, updated_at
```
RLS: admin manage, members select.

### 2. Sync logika (`sync-club-activities`)
Místo párování per aktivita:
- Pro každou aktivitu spočítat `athlete_key`.
- Lookup v `club_athlete_mappings`:
  - Pokud existuje → použít `matched_user_id` (může být i null = ignorovat).
  - Pokud neexistuje → vytvořit nový řádek s `matched_user_id = null` (auto-fuzzy match volitelně předvyplní návrh, ale admin potvrdí).
- Aktivity ukládat dál do `club_activities`, ale `matched_user_id` se odvozuje z mappingu (denormalizováno pro rychlost — sync ho přepíše).

### 3. Match endpoint (`match-club-athlete` — nahradí `match-club-activity`)
Vstup: `{ athlete_key, user_id | null }`.
Akce:
- Upsert do `club_athlete_mappings`.
- Hromadný `UPDATE club_activities SET matched_user_id = ? WHERE athlete_firstname=? AND athlete_lastname_initial=?`.
- Recalc YTD pro starého i nového usera.

### 4. Admin UI (`ClubStravaAdmin.tsx`)
Místo tabulky aktivit s per-row selectem → **dvě sekce**:

**A) Atleti klubu** (z `club_athlete_mappings`)
| Atlet | Počet aktivit | Σ km | Spárovaný člen |
|-------|---------------|------|----------------|
| Jan N. | 12 | 340 | [Select: člen / nepřiřazeno / ignorovat] |

Jeden Select per atleta → vyřeší všechny jeho aktivity najednou.

**B) Poslední aktivity** (read-only, pro přehled co se synclo)
Tabulka jen pro náhled, bez akce.

### 5. Migrace existujících dat
Z aktuálních `club_activities` vytáhnout distinct `(firstname, lastname_initial, matched_user_id)` a naplnit `club_athlete_mappings`. Zachová stávající ručně provedená párování.

## Implementační kroky
1. Migrace: vytvořit `club_athlete_mappings` + RLS + naplnit z existujících dat.
2. Upravit `sync-club-activities`: lookup mapping, propagovat `matched_user_id`.
3. Vytvořit `match-club-athlete` edge function, smazat `match-club-activity`.
4. Přepsat `ClubStravaAdmin.tsx` na athlete-centric UI.

## Co potřebuji od tebe
Jak řešit **fuzzy auto-návrh** pro nové atlety?
- (a) Sync vytvoří mapping s `matched_user_id = null` a admin sám přiřadí (čisté, vždy explicitní).
- (b) Sync zkusí fuzzy match proti `profiles` a předvyplní návrh, admin pouze potvrdí/změní (rychlejší, ale může napárovat omylem).
