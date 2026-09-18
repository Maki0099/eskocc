# Odhalení duplicitních jízd ze Stravy

## Co jsem zjistil v datech

V klubových datech je 605 jízd a žádné dvě nejsou úplně shodné — protože se ukládají podle otisku složeného z přesné vzdálenosti, času a převýšení. Stačí ale, aby se stejná jízda nahrála podruhé s minimálně jiným časem, a projde jako nová.

Příklady, které přesně tak vypadají:

- Robert V. — 81,1 km, 883 m, časy 11241 s vs. 11235 s (rozdíl 6 sekund)
- Martin H. — 41,9 km, 269 m, dvakrát (VirtualRide)
- Martin H. — 42,8 km, 402 m, dvakrát (VirtualRide)
- Martin K. — 86,3 km / 974 m a 86,4 km / 983 m
- Martin K. — 38,7 km / 853 m a 38,6 km / 858 m

Tyto jízdy se dnes do statistik započítávají dvakrát.

## Co postavím

### 1. Detekce podezřelých dvojic
Nový přehled v administraci najde dvojice jízd stejného jezdce, kde se vzdálenost liší o méně než 50 m a převýšení o méně než 10 m. Ke každé dvojici se zobrazí obě hodnoty (km, čas, převýšení, typ sportu) a jak moc se liší, aby šlo rozhodnout.

### 2. Označení duplicity
U každé dvojice tlačítko „Označit jako duplicitu". Po potvrzení se jedna z jízd přestane počítat — kilometry i metry zmizí ze žebříčku, z profilu člena i z grafu průběhu sezóny. Rozhodnutí jde vrátit zpět tlačítkem „Přece jen počítat".

Označené jízdy zůstávají v databázi, jen se nezapočítávají — nic se nemaže.

### 3. Trvalost při další synchronizaci
Denní synchronizace ze Stravy nesmí označení přebít. Jízda si příznak udrží, protože se párují podle stejného otisku.

## Technické detaily

- Migrace: sloupec `excluded_as_duplicate boolean not null default false` (+ `excluded_at`, `excluded_by`) na `club_activities`; upsert v `sync-club-activities` tento sloupec nepřepisuje.
- Nová RPC `get_duplicate_activity_candidates()` (security definer, jen admin): self-join `club_activities` na `athlete_full`, `abs(distance_m diff) <= 50`, `abs(elevation_gain diff) <= 10`, vynechá už vyřazené a jízdy pod 1 km, vrátí obě strany dvojice.
- Nová RPC `set_activity_duplicate(_id uuid, _excluded boolean)` (admin-only), po změně volá `recalc_club_ytd()`.
- `recalc_club_ytd()` a `get_member_yearly_progress()` doplní podmínku `AND excluded_as_duplicate = false`.
- Nová komponenta `src/components/admin/DuplicateActivitiesAdmin.tsx`, zařazená do `src/pages/Admin.tsx` vedle správy Strava klubu.
- GRANT EXECUTE pouze pro `authenticated`, kontrola `has_role(auth.uid(), 'admin')` uvnitř funkcí.

Jízdy s nulovou vzdáleností ponechávám beze změny podle tvého rozhodnutí.
