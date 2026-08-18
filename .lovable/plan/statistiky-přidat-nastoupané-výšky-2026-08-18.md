# Statistiky: přidat nastoupané výšky

Ano, jde to — data o převýšení už v databázi jsou. Aktivity synchronizované ze Stravy obsahují u každé jízdy nastoupané metry, jen se zatím nikde nesčítají ani nezobrazují.

## Co přibude

**Statistiky (seznam členů)**
- U každého člena vedle najetých km i nastoupané metry za letošní rok.
- Přepínač řazení: podle kilometrů / podle převýšení.

**Souhrn klubu**
- Nová dlaždice „Nastoupáno celkem" (součet za klub) a průměr na aktivního člena.

**Profil člena**
- Nová karta ve statistikách roku: nastoupané metry.
- V grafu „Průběh sezóny" přepínač km / převýšení, aby se dala zobrazit kumulativní křivka nastoupaných metrů.

**Export obrázku statistik**
- Vyexportovaný přehled bude obsahovat i sloupec s převýšením.

## Technické provedení

1. **Databáze (migrace)**
   - `profiles`: nový sloupec `strava_ytd_elevation` (integer, default 0).
   - `recalc_club_ytd()`: doplnit sumu `elevation_gain` z `club_activities` (stejná logika jako u vzdálenosti, včetně nulování neaktivních).
   - `get_member_statistics()`: vrátit navíc `strava_ytd_elevation`.
   - `get_public_club_stats()` / `get_club_teaser_stats()`: doplnit `ytd_elevation`.
   - `get_member_yearly_progress()`: vrátit navíc `day_elevation` a `cumulative_elevation`.
   - Pohled `member_profiles_public`: doplnit `strava_ytd_elevation`.

2. **Frontend**
   - `src/pages/Statistics.tsx` — zobrazení převýšení, přepínač řazení, doplnění do exportu.
   - `src/components/statistics/ClubSummaryStats.tsx` — nová dlaždice.
   - `src/pages/MemberProfile.tsx` — karta s převýšením.
   - `src/components/member/YearlyProgressChart.tsx` — přepínač metriky km / m převýšení (cílová čára zůstává jen u km).
   - `src/hooks/useClubStats.ts`, `src/hooks/useUserStats.ts` — nová pole.

## Poznámka k datům

Roční cíle (`yearly_challenge_settings`) zůstávají jen kilometrové — převýšení bude čistě informativní metrika bez vlastního cíle. Pokud budeš chtít i cíl na převýšení, přidám ho v dalším kroku.
