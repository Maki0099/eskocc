## Cíl

Vytvořit novou veřejnou SEO landing page na `/pruvodce-beskydy` — obsáhlý průvodce cyklistikou v Beskydech, který cílí na vyhledávací dotazy typu „cyklistika Beskydy", „cyklotrasy Beskydy", „kolo Beskydy" a přivádí návštěvníky na klubový web s odkazy do interních sekcí (Trasy, Akce, Statistiky, Kavárna, O nás).

## Struktura stránky

Jeden semantický `<article>` s jedním `<h1>` a logickou hierarchií `<h2>`/`<h3>`. Obsah v češtině, tón věcný a přátelský, délka cca 1500–2000 slov.

### Sekce

1. **Hero** — H1 „Průvodce Beskydy na kole", krátký lead, CTA na `/trasy` (oblíbené trasy) a `/akce` (klubové akce).
2. **Proč jezdit v Beskydech** (H2) — krajina, terén, sezóna.
3. **Nejlepší cyklotrasy v Beskydech** (H2) — H3 podsekce pro silnici, gravel a MTB. Dynamicky vypsat 6 položek z `favorite_routes` (řazeno podle `is_featured`/`created_at`) jako karty s odkazy na `/trasy/:slug`.
4. **Sezóna a počasí** (H2) — jaro/léto/podzim, doporučené měsíce.
5. **Co si vzít s sebou** (H2) — kolo, vybavení, bezpečnost.
6. **Kde se občerstvit** (H2) — odkaz na `/kavarna` (klubová kavárna) + tipy na místa.
7. **Klubové akce a vyjížďky** (H2) — odkaz na `/akce`, krátký popis společných jízd.
8. **Připojte se ke klubu** (H2) — odkaz na `/o-nas` a `/registrace`.
9. **Často kladené otázky (FAQ)** (H2) — 6–8 otázek (např. „Kde začít s cyklistikou v Beskydech?", „Která trasa je nejlehčí?", „Kdy je nejlepší sezóna?", „Potřebuji horské kolo?", „Jak najdu parťáky na vyjížďku?"). Každá Q jako H3.
10. **Závěr + CTA** — odkaz na `/trasy` a `/registrace`.

### Interní odkazy (povinné v textu)

`/trasy`, `/akce`, `/statistiky`, `/kavarna`, `/o-nas`, `/galerie`, `/registrace`, plus minimálně 3 odkazy na konkrétní trasy z DB.

## Technická implementace

- **Nová stránka** `src/pages/PruvodceBeskydy.tsx`:
  - `useQuery` na `favorite_routes` (limit 6, veřejně čitelné dle stávajících RLS).
  - `<Seo>` komponenta: title „Průvodce Beskydy na kole | ESKO CC", description ~155 znaků, canonical `/pruvodce-beskydy`, OG image (hero z `src/assets`), JSON-LD typu `Article` + `FAQPage` (otázky/odpovědi z FAQ sekce).
  - Layout: existující `Header` + `Footer`, kontejner s typografií jako `/o-nas`.
- **Route** v `src/App.tsx`: přidat `<Route path="/pruvodce-beskydy" element={<PruvodceBeskydy />} />` nad catch-all. Konstanta `ROUTES.GUIDE_BESKYDY = "/pruvodce-beskydy"` v `src/constants/routes.ts`.
- **Sitemap** (`public/sitemap.xml`): přidat URL `https://www.eskocc.cz/pruvodce-beskydy`, `changefreq=monthly`, `priority=0.8`.
- **Interní prolinkování zpět**: přidat textový odkaz na průvodce do patičky (`Footer`) v sekci „Užitečné" a z `/trasy` hlavičky (krátká věta „Inspirace najdeš v našem [průvodci Beskydy](/pruvodce-beskydy)").
- **Hero obrázek**: vygenerovat 1 fotorealistický obrázek beskydské krajiny s cyklistou (`src/assets/pruvodce-beskydy-hero.jpg`, ~1600×900, `fetchPriority="high"`).

## Mimo rozsah

- Vícejazyčné verze.
- Blog/CMS systém pro další články (pouze tato jedna stránka).
- Změny v stávajících SEO tagech jiných stránek.

## Otázka k potvrzení

Text vygeneruji sám na základě dat z `favorite_routes` a obecných znalostí o Beskydech. Pokud máš vlastní formulace nebo konkrétní tipy (lokality, parťácká místa, oblíbené kavárny), pošli je teď a zapracuji je — jinak pokračuji s vlastním návrhem.