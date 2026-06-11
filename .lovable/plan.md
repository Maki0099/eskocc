# Plán: Zrychlení načítání homepage (FCP, LCP, Speed Index)

Aktuálně: FCP 5,7 s · LCP 10,8 s · SI 6,2 s. Hlavní viníci jsou nadrozměrné obrázky v `public/` (PWA ikony 737 KB při rozměru 64–512 px), 380 KB hero JPG bez moderního formátu/preloadu, načítání všech sekcí homepage najednou a parallax efekt blokující LCP obrázek.

## Co uděláme

### 1) Drasticky zmenšit ikony v `public/`
- `pwa-64x64.png` 737 KB → ~3 KB (převést, resize na 64×64)
- `pwa-192x192.png` 737 KB → ~15 KB
- `pwa-512x512.png` 737 KB → ~60 KB
- `maskable-icon-512x512.png` 694 KB → ~60 KB
- `apple-touch-icon-180x180.png` 684 KB → ~10 KB (nebo úplně smazat – už existuje 9 KB `apple-touch-icon.png`)
- Smazat `favicon-source.png` (není potřeba v produkci)

Důvod: tyto soubory cachuje service worker při `install` (workbox precache) → blokují první návštěvu i následnou aktualizaci. Aktuálně cca 3,5 MB ikonek navíc.

### 2) Hero obrázek – LCP kandidát
- Vygenerovat `hero-cycling.webp` (~80–120 KB) a `hero-cycling.jpg` zmenšit na ≤1600 px šířku (~120 KB).
- V `index.html` přidat `<link rel="preload" as="image" href="..." fetchpriority="high" type="image/webp">` pro hero.
- V `HeroSection.tsx` použít `<picture>` s WebP + JPG fallbackem.
- Odstranit `backdrop-blur-[2px]` z hero overlay (drahá kompozice na mobilu, zpomaluje paint LCP elementu).
- Parallax: zachovat, ale počáteční `transform: scale(1.1)` ponechat – `translateY` má jen kosmetický efekt, není kritické pro LCP.

### 3) Code-split homepage sekcí
V `src/pages/Index.tsx` lazy-loadovat sekce pod foldem (`FeaturesSection`, `ClubhouseSection`, `CTASection`, `LeadershipSection`, `TeaserSection`, `InstallBanner`) přes `React.lazy` + `<Suspense fallback={null}>`. `HeroSection` zůstává eager – musí být v LCP frame.

### 4) Odložit nekritickou logiku v Heru
- `useClubStats()` načítá data z DB synchronně při mountu Hera. Přesunout volání do efektu uvnitř malé sub-komponenty `HeroStatsLine`, kterou lazy-loadneme (Suspense fallback = nezobrazovat statistiku). LCP element (`<h1>`/text) tak nezávisí na fetchnutí dat.

### 5) Fonty
Pokud `index.css` načítá Google Fonts přes `@import`, přesunout do `<link rel="preconnect">` + `<link rel="stylesheet" media="print" onload="this.media='all'">` v `index.html`. Ověříme při implementaci.

### 6) Service worker globPatterns
Ve `vite.config.ts` ve `VitePWA.workbox.globPatterns` vyloučit původní obří `pwa-*.png` po jejich zmenšení (ne nutné, jen ověřit max 5 MiB limit – po zmenšení vyhovuje).

## Očekávaný dopad
- FCP: 5,7 s → ~1,8 s (méně bytů v kritické cestě)
- LCP: 10,8 s → ~2,5 s (preload + WebP + bez blur)
- Speed Index: 6,2 s → ~2,5 s (code-split sekcí)

## Technické detaily
- Resize/konverze: ImageMagick + cwebp v sandboxu (jednorázový build krok, výsledek commitnut).
- Žádné změny v UX ani designu – jen formát/velikost obrázků a pořadí načítání.
- Žádné backend/DB úpravy.

## Mimo rozsah
- Refaktor parallax hooku
- Změny v Admin sekci
- Změny PWA manifest struktury (cesty k ikonám zůstávají stejné)
