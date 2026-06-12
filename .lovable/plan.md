# Mobilní optimalizace homepage (LCP 10,3 s → cíl ~3 s)

Desktop je v zeleném pásmu, neměníme. Všechny změny cílí na mobil, kde React hydratace + `opacity-0` animace odsouvají LCP element (text „Jezdi tak dlouho…") o několik sekund.

## Změny

### 1) Odstranit `opacity-0` z above-fold textu v `HeroSection.tsx`
Text, logo a podtitul jsou nad foldem a jsou LCP kandidáti. Aktuálně mají `opacity-0 animate-fade-up animation-delay-*`, takže jsou neviditelné dokud React nehydratuje a CSS animace neproběhne. Odstraníme `opacity-0` a `animation-delay-*` třídy z těchto elementů (logo, kicker, hlavní `<h1>` div, citace Merckx, hlavní popis a CTA tlačítka). Text se vykreslí okamžitě z prerenderu. Animace `animate-fade-up` zůstane na sekcích pod foldem (statistika klubu), které nejsou LCP.

### 2) Preload hero WebP s `fetchpriority="high"`
Aktuálně je hero v `<picture>` uvnitř React komponenty → preload scanner ho najde až po parsování JS bundle. Přesuneme `hero-cycling.webp` do `/public/hero-cycling.webp` (stabilní URL bez Vite hashe) a v `index.html` přidáme:
```html
<link rel="preload" as="image" href="/hero-cycling.webp" type="image/webp" fetchpriority="high" media="(max-width: 768px)" />
```
V `HeroSection.tsx` přepneme import na absolutní cestu `/hero-cycling.webp`.

### 3) Round logo do `/public`
`logo-round-dark.png` a `logo-round.png` jsou nad foldem (24×24, ~6 KB každé). Přesuneme do `/public/logo-round-dark.png` a `/public/logo-round.png`, importy v Hero nahradíme stringovou cestou. Tím se vyhneme čekání na JS bundle pro vyřešení hashed URL.

### 4) Odložit `useClubStats()` mimo Hero
Hook volá Supabase RPC při mountu Hera a způsobuje re-render LCP frame. Vytvoříme novou malou komponentu `HeroStatsLine` (samostatný soubor), která drží `useClubStats` + `useCountUp` a render `<p>... km najezdil klub letos</p>`. V `HeroSection.tsx` ji lazy-loadneme přes `React.lazy` + `<Suspense fallback={null}>`. Hero se vykreslí bez čekání na statistiku; číslo doskočí později.

### 5) Service worker — vynechat velké PWA ikony z precache
Ve `vite.config.ts` `workbox.globPatterns` aktuálně cachuje všechny PNG včetně `pwa-512x512.png` a `maskable-icon-512x512.png` (~157 KB dohromady). Tyto soubory PWA potřebuje jen při instalaci z manifestu, ne pro běh aplikace. Přidáme do `globIgnores`:
```
"**/pwa-512x512.png", "**/maskable-icon-512x512.png", "**/splash-*.png"
```

## Mimo rozsah
- Desktop layout (nezměněno)
- Parallax hook, design, kopie
- Backend/DB
- Refaktor ostatních sekcí

## Očekávaný dopad (mobil)
- LCP: 10,3 s → ~2,5–3,5 s (text vidí okamžitě + hero preload)
- Speed Index: 4,9 s → ~3,5 s
- FCP: 2,9 s → beze změny (limit TTFB)
