## Kontext

V `favorite_routes` aktuálně nejsou žádné beskydské trasy (jen Mallorca + jedna „Na pržno"). Sekce „Doporučené trasy z naší databáze" tedy zobrazuje irelevantní obsah. Níže navrhuju komplexní rozšíření článku, aby působil jako plnohodnotný průvodce a zároveň lépe vyhovoval SEO i návštěvníkům.

## Hlavní změny

### 1. Nahradit dynamický blok kurátorovaným seznamem beskydských tras
- Odebrat dotaz na `favorite_routes` (nebo ho zúžit přes nový sloupec `region` – viz volitelný bod B níže).
- Zavést **statický pole 6 ručně sestavených beskydských tras** s popisem, profilem (km, převýšení, povrch), startem a externími odkazy (Mapy.cz/Komoot/Strava segment).
  - Příklady: Karolinka → Soláň → Velké Karlovice (okruh, ~45 km/900 m), Pustevny od Trojanovic (15 km/700 m), Lysá hora od Krásné (11 km/1100 m), Bečva Cyklostezka (rovinatá rodinná), Bumbálka okruh, gravel přes Javorníky.
- Každá karta: ikona terénu, obtížnost (badge), tlačítka „GPX (Mapy.cz)" a „Komoot".

### 2. Interaktivní mapa regionu (Mapbox)
- Použít existující `MAPBOX_PUBLIC_TOKEN` a vzor z `src/components/map/ClubLocationMap.tsx`.
- Nová komponenta `BeskydyOverviewMap.tsx`: výchozí pohled na Moravskoslezské Beskydy, **markery POI** (Karolinka – klubovna, Soláň, Pustevny, Lysá hora, Radhošť, Bumbálka, kavárna ESKO.cc) s popupy a odkazy na příslušné sekce.
- Výška ~420 px, lazy-loaded přes `React.lazy` aby neblokovala LCP.

### 3. Fotogalerie Beskyd
- 4–6 AI generovaných fotek (krajina, klikatá silnice, podzim, cyklista u kavárny) – `src/assets/pruvodce-beskydy-{1..6}.jpg`, ~1200×800.
- Komponenta s mřížkou (2 sl. mobile, 3 sl. desktop), `loading="lazy"`, `aspect-[4/3]`, `object-cover`, hover zoom.
- Alt texty s relevantními klíčovými slovy.

### 4. Lepší struktura a čitelnost
- **Sticky table of contents** vlevo na desktopu (anchor odkazy na H2 sekce) – zlepšuje UX a featured snippets.
- **Breadcrumbs** (Domů › Průvodce › Beskydy) + `BreadcrumbList` JSON-LD.
- **Reading time + datum aktualizace** pod H1.
- **„Klíčové výjezdy" srovnávací tabulka** (název, výchozí bod, km, převýšení, povrch, náročnost) – dobré pro snippety.

### 5. Sezónní detail a počasí
- Pod sekcí „Sezóna" přidat **odkaz na ČHMÚ Beskydy** a **upozornění na lavinové/uzávěrkové info** v zimě (zmínka, že silnice na Pustevny/Bílou bývají v zimě nesjízdné).
- Krátký box „Doporučené měsíce" jako vizuální timeline (leden–prosinec barevný strip).

### 6. SEO doplňky
- Rozšířit JSON-LD: přidat `BreadcrumbList` a `TouristAttraction` pro každý významný výjezd.
- `<link rel="prev/next">` pokud později vzniknou další průvodci (placeholder, nyní neaktivní).
- Vylepšit interní prolinkování: přidat odkazy z `/o-nas`, `/akce` a hero homepage na `/pruvodce-beskydy`.
- Přidat čistý anchor link „Sdílet článek" (Web Share API fallback).

### 7. CTA blok nahoře
- Pod hero přidat **3 dlaždice rychlých odkazů**: „Klubové vyjížďky", „Naše trasy", „Kavárna v Karolince" – pomáhá konverzi a snižuje bounce rate.

### 8. FAQ rozšíření
- Přidat 2–3 otázky: „Jaké jsou výjezdy pro elektrokola?", „Kde nechat auto při výjezdu na Soláň?", „Existují v Beskydech bikeparky?".

## Technická implementace

Soubory:
- `src/pages/PruvodceBeskydy.tsx` – přestavba: nahradit dynamický blok, přidat TOC, breadcrumbs, mapu, galerii, tabulku.
- `src/components/map/BeskydyOverviewMap.tsx` – nová Mapbox komponenta s POI markery.
- `src/data/beskydyRoutes.ts` – kurátorovaný seznam tras (typed).
- `src/data/beskydyPois.ts` – seznam POI pro mapu.
- `src/assets/pruvodce-beskydy-{1..6}.jpg` – AI generované fotky (`imagegen` standard quality).
- `src/components/Seo.tsx` – beze změny, jen nové JSON-LD pole v page.
- `src/components/home/HeroSection.tsx` (volitelně) – přidat malý odkaz na průvodce.

## Mimo rozsah

- Plnohodnotná CMS pro další průvodce (jen tato stránka).
- Import skutečných GPX beskydských tras do `favorite_routes` (řešitelné samostatně přes existující Route Import Wizard – pokud chceš, můžu to navrhnout zvlášť).
- Skutečné fotky od členů (lze přidat později místo AI obrázků).

## Otázky k potvrzení

1. **Kurátorovaný seznam tras** – chceš čistě statický (rychlé, žádné DB napojení), nebo přidat do `favorite_routes` sloupec `region` a filtrovat na `region = 'Beskydy'` (do budoucna škálovatelné, ale vyžaduje migraci a doplnění dat)?
2. **Fotky** – AI generované (rychle, hned), nebo počkáme až dodáš vlastní z klubového archivu / Google Photos alba?
3. **Mapa** – stačí přehledová mapa s POI markery, nebo chceš i zakreslené hlavní trasy (linie GPX)? Linky vyžadují buď reálné GPX soubory, nebo ručně nakreslené souřadnice.
