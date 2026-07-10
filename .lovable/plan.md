## Zjištěný problém

Na screenshotech grafu „Průběh sezóny 2026" jsou **popisky osy Y oříznuté zleva** — místo `1400` je vidět `l400`, místo `1050` je vidět `i050`. Příčinou je kombinace v `YearlyProgressChart.tsx`:

- `AreaChart` má `margin={{ left: -12 }}` (posouvá obsah doleva mimo kreslicí plochu)
- `YAxis` má `width={44}`, což je při čtyřciferných číslech málo

Vedle toho na mobilním rozlišení (390 px) chybí některé měsíční popisky osy X (únor, duben, červen) — recharts je vypustí, protože se do šířky nevejde 12 popisků vedle sebe.

## Oprava

Úprava jen v `src/components/member/YearlyProgressChart.tsx`, čistě prezentační:

1. Odstranit záporný `left` margin — nechat rozumný kladný, např. `margin={{ top: 8, right: 12, left: 4, bottom: 0 }}`.
2. Zvětšit `YAxis width` na ~52 px, aby se čtyřciferné hodnoty vešly.
3. Přidat na `XAxis` `interval="preserveStartEnd"` a `minTickGap={12}`, aby na mobilu recharts sám rozumně proředil měsíce (leden a prosinec zůstanou vždy). Volitelně zmenšit `fontSize` popisků os na 10 px pro mobil.
4. Ponechat ostatní vzhled (gradient, tooltip, footer) beze změny.

## Ověření

Po změně znovu vyfotit desktop i mobilní pohled (390 × ...) na `/member/:userId` a zkontrolovat, že:
- popisky Y osy `0 / 350 / 700 / 1050 / 1400` jsou celé viditelné
- na mobilu je vidět alespoň `led ... pro` bez ořezu
