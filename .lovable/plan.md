# Co navíc umožní osobní propojení Stravy

Dnes se z každé jízdy ukládá jen: název, skutečné datum a čas startu, vzdálenost, čas v pohybu, převýšení a typ sportu. Strava přitom u osobního účtu posílá u každé jízdy mnohem víc — dřív z klubového rozhraní tohle dostupné nebylo.

## Data, která lze nově získat

- Skutečné datum a čas startu jízdy (už se ukládá) — konečně spolehlivá detekce duplicit i denní/týdenní přehledy.
- Průměrná a maximální rychlost, celkový čas (včetně zastávek), průměrná kadence.
- Tepová frekvence (průměr a maximum) a výkon ve wattech, pokud člen měří.
- Kalorie, hodnocení náročnosti (suffer score).
- Typ jízdy: silnice, gravel, MTB, trenažér, závod, dojíždění.
- Místo startu (souřadnice) a mapová stopa jízdy — lze vykreslit trasu.
- Fotky z jízdy, počet pochval a komentářů.
- Osobní rekordy a segmenty, případně i výbava (které kolo bylo použito).
- Souhrny profilu: celoživotní kilometry, počet jízd, nejdelší jízda.

## Jak to využít v aplikaci

1. **Bohatší profil člena** — vedle kilometrů a převýšení i průměrná rychlost, nejdelší jízda, nejvyšší převýšení, počet jízd, nejaktivnější měsíc.
2. **Heatmapa aktivity** — kalendářová mřížka roku (jako na GitHubu), kde je hned vidět, kdy člen jezdil.
3. **Mapa klubu** — body startů všech jízd a nejčastější trasy členů, jako společná „klubová heatmapa" tras.
4. **Rozpad podle typu sportu** — kolik kilometrů je silnice, gravel, MTB, trenažér; volitelně počítat do výzvy jen venkovní jízdy.
5. **Týdenní a měsíční žebříčky** — díky skutečnému datu lze dělat „jezdec týdne", měsíční souboje, sérii aktivních týdnů.
6. **Automatické odznaky** — první stovka, 1000 m převýšení v jedné jízdě, 10 jízd za měsíc, celoroční série.
7. **Tempo k cíli** — předpověď, zda člen dojede roční cíl, na základě dosavadního tempa, s doporučeným týdenním penzem.
8. **Notifikace a týdenní souhrn** — po synchronizaci upozornění na nový osobní rekord, nedělní shrnutí klubového týdne.
9. **Společné jízdy** — detekce členů, kteří jeli ve stejný čas přibližně stejnou trasu, a označení „jeli spolu".
10. **Spolehlivější duplicity** — porovnání podle skutečného startu jízdy místo dne synchronizace, včetně automatického návrhu.

## Návrh pořadí

Doporučuji začít etapou 1 (nejvíc efektu za nejmenší práci): rozšířit stahování o rychlost, tep, kalorie, typ jízdy a souřadnice startu, doplnit profil člena o nové ukazatele, přidat heatmapu roku a rozpad podle typu sportu. Následně etapa 2: týdenní žebříčky, odznaky a tempo k cíli. Etapa 3: mapa klubu, společné jízdy, notifikace.

## Technická poznámka
Rozšíření sloupců v `member_activities` (average_speed, max_speed, elapsed_time, average/max_heartrate, average_watts, calories, suffer_score, trainer/commute/race příznaky, start_lat/lng, map_polyline, photo_url), doplnění mapování v `sync-member-activities`, jednorázové doplnění historie letošního roku a nové RPC pro agregace (heatmapa, rozpad sportů, týdenní žebříček). Detailní data typu segmenty a výbava vyžadují dotaz na detail jízdy (1 požadavek na jízdu) — nasadit jen dávkově kvůli limitům Stravy.
