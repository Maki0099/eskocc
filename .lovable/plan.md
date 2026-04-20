

## Sekce „Co nabízíme" — nahrazení demo statistik reálnými

### Problém
Bento grid v `FeaturesSection.tsx` používá hardcoded čísla (200+ členů, 500+ tras, 1000+ fotek, 100+ vyjížděk ročně), která **vůbec neodpovídají realitě**:

| Údaj v UI | Reálně v DB |
|---|---|
| 100+ vyjížděk ročně | 4 vyjížďky celkem |
| 200+ členů | 5 členů |
| 500+ tras | 5 oblíbených tras |
| 1000+ fotek | 17 položek v galerii |
| ∞ segmentů (Strava) | bez vazby na data |
| 12 měsíců | čistě deklarativní |

Pro malý začínající klub působí přehnané statistiky nedůvěryhodně.

### Řešení: Live statistiky z DB + kvalitativní popisky

**1. Nový hook `useClubStats.ts`**
Jednorázově načte v `Index.tsx`:
- `members` — `count(user_roles where role in member/active_member/admin)`
- `routes` — `count(favorite_routes)`
- `events_total` — `count(events)`
- `gallery_items` — `count(gallery_items)`
- `ytd_km` — `sum(profiles.strava_ytd_distance)`
- `ytd_rides` — `sum(profiles.strava_ytd_count)`

Cachováno v komponentě (jeden fetch při mountu), s fallbackem na `—` při loadingu.

**2. Úprava `FeaturesSection.tsx`**
Komponenta přijme `stats` jako prop a karty se přemapují na **smysluplné páry**:

| Karta | Stat | Label |
|---|---|---|
| Vyjížďky | `events_total` | proběhlo |
| Komunita | `members` | členů |
| GPX trasy | `routes` | v knihovně |
| Strava | `ytd_km` km | letos najeto |
| Galerie | `gallery_items` | momentek |
| Celoročně | `ytd_rides` | jízd letos |

**3. Doprovodné formátování**
- Pokud `stats == null` (loading), zobrazit jemný skeleton místo čísla.
- Pokud je hodnota 0 (např. nový rok bez aktivit), zobrazit `—` místo `0`, aby karta nepůsobila prázdně.
- Čísla nad 999 formátovat s mezerou (`1 240`).

**4. Honest tone v textech**
Aktuální popisky („Přátelská parta zkušených cyklistů", „Aktivní program za každého počasí") zachovat — jsou kvalitativní, ne kvantitativní, a fungují i pro malý klub.

### Technické detaily

**Soubory:**
- nový: `src/hooks/useClubStats.ts` (~40 řádků, jeden agregační dotaz)
- upravit: `src/components/home/FeaturesSection.tsx` (přijmout prop `stats`, přemapovat `features` array, přidat skeleton state pro `stat`)
- upravit: `src/pages/Index.tsx` (zavolat hook, předat dolů)

**Dotazy:**
Buď 6 paralelních `supabase.from(...).select('*', { count: 'exact', head: true })`, nebo (čistší) jedna RPC funkce `get_public_club_stats()` vracející JSON s veškerými countersy. Doporučuji RPC — méně round-tripů a stats jdou cachovat 1 minutu serverside.

**RLS:**
Counts musí být přístupné anonymním návštěvníkům (sekce je na homepage). Pokud RLS na `favorite_routes`/`gallery_items`/`profiles` blokuje anonymní `count`, RPC `SECURITY DEFINER` to obejde čistě (vrací jen agregát, ne řádky).

### Co se NEmění
- Vizuální design Bento gridu, animace, ikony — vše zůstává.
- Layout 6 karet (large + medium + 4× small) zůstává.

