# Redesign /statistiky — Editorial Sand

Přebíráme kompozici zvoleného prototypu jedna k jedné: vycentrovaný hero s velkým procentem, tři kategorické karty v teplém sandu, rytmické souhrnné dlaždice mezi tenkými linkami a žebříček stavěný jako edic­ní tabulka s tenkou hnědou progress-linkou pod jménem.

## Design tokens (locked z prototypu)

Rozšíříme `src/index.css` a `tailwind.config.ts` o semantické tokeny — žádné hardcoded hexy v komponentách.

```text
--paper       #FAF8F5   (bg-background)
--warm        #F0EBE3   (nová: bg-warm)
--primary     #B7A99A   (už je)
--secondary   #A39382   (už je)
--accent      #7A6855   (už je)
--ink         #2F333A   (foreground)
--success     zůstává jako semantic pro splnění (checkmark + akcent), nahrazuje hardcoded green-600/green-400
```

Přidáme `font-display: "Space Grotesk"` a `font-sans: "DM Sans"` v `tailwind.config.ts`. Fonty se přidají přes `@fontsource/space-grotesk` a `@fontsource/dm-sans` (bun add) a naimportují v `src/main.tsx`. Žádný `<link>` do `index.html`, žádné CDN `@import`.

## Struktura stránky

Zachováme pořadí sekcí, ale přestavíme prezentaci každé z nich podle prototypu.

```text
┌──────────────────────────────────────────────┐
│  SEZÓNNÍ CÍL KLUBU {rok}   (eyebrow uppercase)│
│               78%   (Space Grotesk 6xl/8xl)   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━  (tenký bar)     │
│  Aktuálně 19 625 km    /    Cíl 25 000 km    │
└──────────────────────────────────────────────┘

┌──── Pod 40 ────┬──── 40–60 ────┬──── Nad 60 ────┐
│  4 000 / 5k    │  3 000 / 4k   │  2 500 / 3k    │
│  ▁▁▁▁▁▁▁▁▁▁    │  ▁▁▁▁▁▁▁▁▁▁   │  ▁▁▁▁▁▁▁▁▁▁    │
└────────────────┴───────────────┴────────────────┘

──── Nastoupáno   Čas v sedle   Počet jízd   Ø rychlost ────

Žebříček členů
01  Marek Svoboda ················ 2 452 km
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 92%
02  ...
```

## Změny v souborech

### `src/index.css`
- Přidat `--warm: 34 27% 91%;` (HSL pro #F0EBE3), `--success` a `--success-foreground` (nahrazení hardcoded zelených).
- Zajistit, aby `--background/--foreground/--primary/--secondary/--accent` odpovídaly paletě v obou režimech (light již sedí, dark režim potřebuje ověřit kontrast — pokud se rozjede, nechat `paper/warm` v dark režimu jako tmavší sepia varianty stejné rodiny, ne šedou).
- Přidat utility `.font-display` a `.font-numeric` (tabular-nums pro čísla v žebříčku).

### `tailwind.config.ts`
- `fontFamily.display = ["Space Grotesk", ...]`, `fontFamily.sans = ["DM Sans", ...]`.
- Přidat `colors.warm = "hsl(var(--warm))"`, `colors.success = { DEFAULT, foreground }`.

### `src/main.tsx`
- `import "@fontsource/space-grotesk/400.css"; /500 /600 /700`
- `import "@fontsource/dm-sans/400.css"; /500 /700`

### `src/pages/Statistics.tsx` (hlavní přestavba)
1. **Hero cíle klubu**: nahradit stávající tmavou kartu (řádky 264–300 přibližně) sekcí bez rámečku: eyebrow „Sezónní cíl klubu {currentYear}" (uppercase, `tracking-[0.2em]`, `text-accent`), velké procento v `font-display font-bold text-6xl md:text-8xl text-foreground`, tenký bar (`h-3 bg-warm`, výplň `bg-primary`), pod ním flex `Aktuálně / Cíl` v Space Grotesk. Žádný obrázek zámku ani ikon.
2. **Kategorické karty (Pod 40 / 40–60 / Nad 60)**: `bg-warm p-8 rounded-sm`, nadpis `font-display uppercase text-xl`, číslo `text-3xl font-medium` + `/ {target}k` v `text-accent`, tenký `h-1.5 bg-background` s výplní `bg-secondary`. Odstranit kruhové ikonky kol.
3. **Souhrnné dlaždice (ClubSummaryStats)**: přepsat komponentu na 4-sloupec grid `border-y border-warm py-12 gap-8`, každá buňka je pouze `label uppercase tracking-widest text-accent` + velké `font-display font-bold text-3xl` číslo. Bez pozadí, bez ikon, bez karet.
4. **Žebříček**: přepsat leaderboard tak, aby řádek byl `bg-background py-6` oddělený `space-y-px bg-warm` (linka mezi řádky), s pořadovým číslem `01`, `02`, … v `text-accent font-bold`, avatarem 40px, jménem v `font-display font-bold`, km napravo v `font-numeric`, pod jménem tenký `h-1 bg-warm` progress s `bg-accent` (splněno → `bg-success`). Ikona `CheckCircle2` u splněno zůstává vedle procenta (a11y: doprovod barevného stavu tvarem). Current-user řádek dostane `ring-1 ring-primary/30`, ne barevné pozadí.
5. **Exportní tlačítko a tour**: ponechat na místě, ale vizuálně přerámovat (ghost button s `font-display uppercase text-xs tracking-widest`).
6. **Nadpis stránky**: nahradit velký serif nadpis „Statistiky klubu" novým hero (procento), starý `<h1>` přesunout jako vizuálně skrytý ale sémantický: `<h1 className="sr-only">Statistiky klubu {rok}</h1>`. Podnadpis `Data jsou počítána z aktivit v klubu ESKO.cc na Stravě` se přesune do patičky sekce hero jako drobný text.

### `src/components/statistics/ClubSummaryStats.tsx`
- Kompletně přepsat vizuálně dle bodu 3. Zachovat props/typy, jen JSX.

### `src/components/statistics/StatisticsExportButton.tsx`
- Update stylu tlačítka (ghost, uppercase, Space Grotesk). Bez změny logiky exportu.

## Přístupnost (paralelně s redesignem)

Tyto opravy nastanou při přestavbě, aby se předešlo regresím:
- `<AvatarImage alt={displayName} />` v každém řádku žebříčku.
- `<Progress aria-label={"${displayName}: ${percent}% z ${target} km"}>` na obou progress instancích.
- Wrap obsahu v `<main className="…">` mezi `Header` a `Footer`.
- Použít token `text-success` místo `text-green-600 dark:text-green-400` (řádky 401, 416).
- `min-h-screen` → `min-h-dvh` u wrapperu stránky.

## Non-goals (co se v tomto plánu nemění)

- Datový model, RLS, `get_member_statistics` RPC, gating pro nečleny (stále přes `MemberOnlyContent`).
- Export do PNG (chová se stejně, jen se vizuál v exportu odrazí).
- Ostatní stránky (Home, Events, Dashboard) — jen sdílené tokeny přidané v `index.css`/`tailwind.config.ts` budou k dispozici, ale nasazení jinam je mimo scope.
- Dark mode paleta zůstává, jen se ověří kontrast; kompletní dark-editorial přebarvení není součástí.

## Ověření

1. `bun run build` po každé fázi.
2. Playwright headless s injectovanou session na `/statistiky`, screenshot v 1280×1800 → vizuální porovnání s prototypem.
3. `page.accessibility.snapshot()` — potvrdit, že avatary a progress bary mají přístupné názvy.
4. Přepnutí do dark theme (theme = "dark") a znovu screenshot pro kontrolu čitelnosti.

Po schválení přejdu do build modu a začnu fází „Design tokens + fonty" → „Hero + kategorie" → „Souhrn + žebříček" → „A11y sweep + verifikace".
