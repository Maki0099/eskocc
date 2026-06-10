## Aktuální stav SEO

Po předchozím kole zbývají 4 nálezy. Navrhuji řešit je v tomto pořadí:

### 1. Per-route metadata (HIGH priority) — hlavní práce

**Problém:** Všechny stránky sdílejí stejný `<title>` a `<meta description>` z `index.html`. Navíc je tam zmínka o Brně, ale klub je v Karolince. Canonical odkazuje vždy na homepage.

**Řešení:**
- Doinstalovat `react-helmet-async` + obalit aplikaci `<HelmetProvider>` v `src/main.tsx`.
- Odstranit `<link rel="canonical">` z `index.html` (aby nedocházelo k duplikaci).
- Opravit zmínku o Brně (ověřit `index.html` — aktuálně tam vidím "Karolinka, Beskydy", takže problém asi nálezl scanner u staré verze; přesto sjednotíme).
- Přidat `<Helmet>` blok do každé hlavní stránky s unikátním title (<60 znaků), description (50–160 znaků), canonical a OG tagy:
  - `Index.tsx` (homepage)
  - `Events.tsx` + `EventDetail.tsx` (dynamický title podle názvu vyjížďky)
  - `Statistics.tsx`
  - `Cafe.tsx`
  - `Gallery.tsx`
  - `About.tsx`
  - `Documents.tsx`
  - `Install.tsx`
  - `Login.tsx`, `Register.tsx`, `ResetPassword.tsx`
  - `MemberProfile.tsx` (dynamický + `noindex` kvůli soukromí)
  - `RouteDetail.tsx` (dynamický)
  - `Account.tsx`, `Dashboard.tsx`, `Admin.tsx`, `Notifications.tsx` → `noindex` (soukromé)
  - `NotFound.tsx` → `noindex`

### 2. Performance — LCP hero (LOW)

- V `HeroSection.tsx` přidat na `<img src={heroCycling}>` `fetchpriority="high"`, explicitní `width`/`height`, odstranit případné lazy-loading.
- Do `index.html` přidat `<link rel="preload" as="image" href="..." fetchpriority="high">` pro hero obrázek (pokud lze zjistit hash — alternativně import a preload přes Helmet na homepage).
- Projít `@font-face` pravidla v `src/index.css` a přidat `font-display: swap`.

### 3. Obsahový průvodce Beskydy (LOW, Semrush návrh)

Nová veřejná stránka `/pruvodce-beskydy` s článkem **„Nejlepší cyklotrasy v Beskydech: Průvodce z Karolinky"** cílící klíčová slova *cyklotrasy* (1 000/mo) a *cyklotrasy mapa* (590/mo). Zahrnuje:
- úvod o regionu a klubu,
- 4–6 doporučených tras (čerpat z `favorite_routes` v DB),
- ke stažení GPX, mapy,
- CTA na registraci do klubu.

Přidat do `sitemap.xml`, `llms.txt` a navigace.

**Otázka:** Tohle je větší kopírovací práce — chceš, abych obsah napsal sám (na základě dat klubu), nebo doplníš text ty?

### 4. Google Search Console (MID)

Vyžaduje OAuth na účet uživatele:
- Připojím GSC konektor (`standard_connectors--connect`).
- Ověřím vlastnictví domény přes meta tag.
- Odešlu `sitemap.xml`.

**Vyžaduje akci od tebe** (autorizovat Google účet).

---

## Doporučené pořadí dnešního loopu

Navrhuji v jednom kroku udělat **bod 1 (metadata) + bod 2 (performance)** — to jsou jasné technické fixy s vysokým dopadem. Body 3 a 4 doděláme zvlášť, protože vyžadují tvoje rozhodnutí (text vs. OAuth).

Souhlasíš s tímto postupem? Nebo chceš začít od jiného bodu?
