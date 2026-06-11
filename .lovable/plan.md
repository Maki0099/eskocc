## Plán: Nová favicon z loga ESKO.cc

Vytvořím sadu favicon souborů z nahraného loga (tmavý "yin-yang" symbol klubu) a propojím je v `index.html`.

### Kroky

1. **Uložení zdrojového loga**
   - Nahraný obrázek uložím jako `public/favicon-source.png` (master verze).

2. **Generování favicon variant** (přes ImageMagick v sandboxu)
   - `public/favicon.ico` — multi-size ICO (16, 32, 48 px) — výchozí pro prohlížeče
   - `public/favicon-16x16.png`
   - `public/favicon-32x32.png`
   - `public/favicon-96x96.png`
   - `public/apple-touch-icon.png` (180×180) — logo na světlém pozadí pro iOS
   - Všechny varianty zachovají transparentní pozadí (kromě apple-touch-icon, kde iOS pozadí nepodporuje → použiju krémové `#FAF8F5` ladící s brand paletou)

3. **Úprava `index.html`**
   - Přidám `<link rel="icon" href="/favicon.ico" sizes="any">`
   - Přidám `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">`
   - Přidám `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">`
   - `apple-touch-icon` link už existuje (`apple-touch-icon-180x180.png`) — buď ho přepíšu novým logem, nebo nahradím cestu na `/apple-touch-icon.png`

### Pozn.
- PWA ikony (`pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`) **neměním** — používají oficiální kulaté logo klubu dle memory `branding/club-identity`. Pokud chceš i ty přegenerovat z tohoto symbolu, dej vědět.
- Pro apple-touch-icon je nutné neprůhledné pozadí (jinak iOS dá černé). Použiju krémovou z brand palety.

Mám pokračovat?
