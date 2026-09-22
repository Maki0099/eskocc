# Klikatelné trasy na mapě klubu

## Cíl
Na stránce Mapa klubu (`/mapa-klubu`) půjde kliknout na libovolnou vykreslenou trasu (nebo její startovní bod). Trasa se zvýrazní, ostatní zeslabí a zobrazí se detail trasy – stejný interaktivní detail jako v sekci Trasy na profilu člena, včetně stažení GPX.

## Kroky

1. **Databáze – rozšíření RPC `get_club_activity_polylines(_days)`**
   - Funkce nově vrátí i `id` aktivity, `name` (název jízdy), `elevation_gain` a `moving_time`, aby měl detail všechna potřebná data.
   - Přístup zůstane pouze pro přihlášené členy.

2. **Sdílená komponenta detailu trasy `RouteDetailDialog`**
   - Vyčlení se současná logika detailu z `MemberRoutes.tsx` do znovupoužitelné komponenty: interaktivní Mapbox mapa trasy, start/cíl značky, metadata (vzdálenost, převýšení, čas) a tlačítko Stáhnout GPX.
   - `MemberRoutes.tsx` se přepne na tuto sdílenou komponentu (beze změny chování v sekci Trasy).

3. **Interaktivita v `ClubMap.tsx`**
   - Přidá se neviditelná širší „klikací" vrstva nad trasy a nová zvýrazňovací vrstva pro vybranou trasu.
   - Klik na trasu nebo startovní značku vybere trasu: zvýrazní se (silnější čára, plná krytí), ostatní trasy a značky zeslabí; klik mimo trasu výběr zruší.
   - Kurzor nad trasami se změní na ukazatel.

4. **Panel detailu vybrané trasy pod mapou**
   - Název jízdy, člen (odkaz na jeho profil), datum, vzdálenost, převýšení, čas, případně označení virtuální jízdy.
   - Tlačítka: **Zobrazit trasu** (otevře `RouteDetailDialog` s mapou), **Stáhnout GPX**, **Zrušit výběr**.
   - Bez výběru se místo panelu ukáže nápověda „Klikni na trasu nebo startovní bod…".

## Technické poznámky
- Data: `member_activities` přes existující RPC; žádné nové tabulky.
- Typy: `ActivityLine` v `ClubMap.tsx` se rozšíří o `id`, `name`, `elevation_gain`, `moving_time`.
- Virtuální jízdy zůstávají modré a přerušované i při zvýraznění (jen silnější).
- GPX stažení použije sdílený helper `downloadRouteGpx` (dekódování polyline → GPX soubor).

## Ověření
- Build bez chyb.
- Prohlížečový test na `/mapa-klubu`: klik na trasu → zvýraznění + panel, klik na Zobrazit trasu → dialog s mapou a tlačítkem Stáhnout GPX.
