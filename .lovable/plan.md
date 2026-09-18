# Další využití dat ze Stravy

Data z osobně propojených účtů (rychlost, tep, watty, kalorie, suffer score, typ jízdy, souřadnice startu, mapová stopa) už se ukládají, ale zatím se využívá jen část. Návrh dalších funkcí ve třech balíčcích — od nejjednodušších po náročnější.

## Balíček A — Motivace a soutěživost (doporučuji jako první)

1. **Týdenní žebříček klubu** — na stránce Statistiky nová karta „Tento týden": km, převýšení a počet jízd za aktuální týden napříč členy. Využívá data, která už máme.
2. **Tempo k ročnímu cíli** — u každého člena ve statistikách indikátor „napřed / pozadu" vůči ideálnímu tempu (cíl rozpočtený na dny v roce) a odhad data dosažení cíle podle aktuálního průměru.
3. **Odznaky** — automatická ocenění na profilu člena: „Stovka" (jízda 100+ km), „Horolezec" (2000+ m v jedné jízdě), „Pravidelnost" (jízda každý týden v měsíci), „Brzy ráno" (jízda začínající před 6:00). Počítáno z member_activities, bez ruční práce.
4. **Osobní rekordy** — na profilu člena sekce s nejdelší jízdou, nejrychlejší jízdou, nejvíce nastoupanými metry (část už je v Ukazatelích sezóny, doplnit o historické maximum přes všechny roky).

## Balíček B — Mapy a společné jízdy

5. **Mapa klubu** — stránka s mapou (Mapbox, stejně jako u tras) se startovními body jízd všech členů za zvolené období. Ukáže, kde klub nejvíc jezdí. Využije start_lat/start_lng.
6. **Společné jízdy** — detekce jízd, kde se dva a více členů potkali (stejný den, podobná vzdálenost, blízký start). Na profilu člena sekce „Jel jsem s…" — posiluje klubový pocit.
7. **Stopa jízdy na mapě** — u detailního výpisu jízd člena možnost zobrazit trasu konkrétní jízdy z map_polyline.

## Balíček C — Tréninkové ukazatele

8. **Zátěž a forma** — graf týdenní zátěže (km + převýšení + suffer score) na profilu člena; jednoduchý trend „forma stoupá/klesá" ze srovnání posledních 6 týdnů s předchozími 6.
9. **Tepová zóna průměrů** — přehled průměrného a max tepu v čase (jen u členů s hrudním pásem).
10. **Filtrování statistik** — ve statistikách klubu přepínač „jen kolo / včetně trenažéru / bez dojíždění" podle is_trainer a is_commute, aby čísla lépe odpovídala skutečným vyjížďkám.

## Technické poznámky

- Balíček A: jen nové RPC funkce nad `member_activities` + úpravy `Statistics.tsx` a `MemberProfile.tsx`; žádné nové sloupce.
- Balíček B: RPC pro agregaci startovních bodů a párování jízd; mapa přes existující Mapbox token.
- Balíček C: RPC pro týdenní agregace; suffer score má jen část členů (podle předplatného Stravy), ukazovat jen kde data jsou.
- Vše čte jen existující data ze synchronizace — žádné změny v edge funkcích ani nové požadavky na Strava API.

## Doporučené pořadí

Nejdřív Balíček A (nejvíc efektu za nejméně práce), pak B, pak C. Lze schválit i jen část — napiš, které body tě zajímají.
