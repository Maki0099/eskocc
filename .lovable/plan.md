# Další využití rozšířených dat ze Stravy

## Co už máme k dispozici
Od posledního rozšíření ukládáme u každé aktivity: čas v pohybu i celkový, průměrnou a maximální rychlost, průměrný a maximální tep, watty, kadenci, kalorie, suffer score, příznaky trenažér/dojíždění/závod, startovní souřadnice a zakódovanou trasu (`map_polyline`).

## Navrhované balíčky

### Balíček A: Klubová soutěživost a rekordy
- **Klubové rekordy** – samostatná stránka `/rekordy-klubu` s nejdelší jízdou, největším převýšením, nejrychlejší průměrkou a nejvíce kaloriemi v jedné aktivitě (vše za aktuální rok i celkově).
- **Měsíční žebříček** – vedle týdenního žebříčku i přehled podle aktuálního měsíce.
- **Série pravidelnosti** – kolik týdnů v řadě má člen alespoň jednu jízdu; odznak za 4/8/12 týdnů.
- **Individuální cíle** – každý člen si může nastavit vlastní roční cíl km a sledovat tempu k němu na svém profilu.

### Balíček B: Mapy a trasy
- **Vykreslení skutečných tras na mapě klubu** – místo jen startovních bodů zobrazit zjednodušené polyliny jízd (za vybrané období 30/90/365 dní).
- **Osobní heatmapa s trasami** – na profilu člena heatmapa jeho jízd podle skutečných tras, nejen startovních bodů.
- **Detail aktivity z rekordů/mapy** – kliknutím na jízdu otevřít modální okno s mapou trasy, profilem výškového profilu a klíčovými metrikami.

### Balíček C: Tréninkové a zdravotní přehledy
- **Tepové zóny** – rozpad aktivit do tepových pásem (např. zóny 1–5 odpočinková/aerobní/tempo/anaerobní/VO2max) podle maximálního tepu odhadnutého z věku.
- **Výkonnostní křivka** – z `average_watts` a `max_speed` ukázat trend síly během sezóny.
- **Kalorický přehled** – měsíční graf spálených kalorií a celkový součet za rok.
- **Trenažér vs venku** – poměn jízd na trenažéru a venku v čase.

## Technické poznámky
- Všechny nové přehledy čtou existující data z `member_activities`, nevyžadují změnu Strava API ani edge funkcí.
- Polyliny z Stravy jsou zjednodušené (`summary_polyline`), takže detail trasy bude orientační, ne centimetrově přesný.
- Tepové zóny a výkonnostní ukazatele závisí na tom, že člen má snímač tepu/výkonu – u jízd bez těchto dat se nebudou zobrazovat.
- Pro klubové rekordy a měsíční žebříčky stačí nové RPC funkce; pro mapu s trasami je nutné upravit existující komponentu `ClubMap.tsx` a vytvořit `MemberActivityMap.tsx`.

## Doporučené pořadí
1. **Balíček A** – největší efekt pro celý klub, minimální práce.
2. **Balíček C** – zajímavý pro jednotlivé členy, střední náročnost.
3. **Balíček B** – vizuálně nejsilnější, ale vyžaduje více práce s mapou a výškovým profilem.

## Co schválit
Který balíček (nebo všechny tři) chceš začít implementovat? Doporučuji A jako první.