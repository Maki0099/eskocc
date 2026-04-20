

## Oprava: „km letos" v hero sekci = klubový součet, ne osobní YTD

### Problém
V `HeroSection.tsx` (ř. 60–62) se zobrazuje `ytdDistance` z hooku `useUserStats` — což je **YTD aktuálního přihlášeného uživatele** (`profiles.strava_ytd_distance`), nikoli součet všech členů klubu. U právě přihlášeného admina to vyjde jako 646 km, ale prezentuje se to vizuálně jako klubový údaj.

### Řešení
Použít už existující `useClubStats` hook (vytvořený minule pro Bento grid), který načítá `ytd_km` = `SUM(strava_ytd_distance)` přes všechny profily přes RPC `get_public_club_stats()`. Ten už je veřejný (SECURITY DEFINER), takže funguje i pro nepřihlášené.

### Změny

**`src/components/home/HeroSection.tsx`**
- Nahradit import `useUserStats` → `useClubStats` (a `formatStatNumber`).
- `ytdDistance` (osobní) nahradit `stats?.ytd_km` (klubový součet).
- Animace `useCountUp` zůstává — jen pojede na klubovém čísle.
- Změnit podmínku zobrazení: místo `user && ytdDistance !== null` použít `stats && stats.ytd_km > 0` — tj. **zobrazit všem návštěvníkům** (i nepřihlášeným), protože je to veřejný klubový údaj.
- Upravit text labelu pro jasnost: `„{X} km najezdil klub letos"` místo nejednoznačného `„X km letos"`.

### Co se NEmění
- Vizuální styl, animace, layout hero sekce.
- `useUserStats` se z HeroSection odstraní (nikde jinde tam nebyl použit), zbytek aplikace ho používá dál.
- RPC ani DB schéma — `get_public_club_stats` už `ytd_km` vrací.

### Edge cases
- Pokud `stats.ytd_km === 0` (začátek roku, žádné aktivity), řádek se vůbec nezobrazí — žádné nešťastné „0 km letos".
- Loading: během načítání `stats === null`, řádek se nezobrazí (žádný flash skeletonu v hero).

