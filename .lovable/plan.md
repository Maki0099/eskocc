## Cíl
Přidat na stránku Statistiky tlačítko **"Exportovat jako obrázek"**, které vygeneruje PNG snapshot celé stránky (klubový cíl, věkové kategorie, souhrn a žebříček) a stáhne ho, případně nabídne sdílení přes Web Share API na mobilu.

## Postup

### 1. Instalace knihovny
Nainstalovat `html-to-image` (lightweight, cca 15 kB, funguje s Tailwind/CSS Grid, podporuje `Promise<Blob>` a data URL).

```
bun add html-to-image
```

### 2. Nová komponenta `StatisticsExportButton.tsx`
Umístění: `src/components/statistics/StatisticsExportButton.tsx`.

Props: `targetRef: React.RefObject<HTMLElement>`, `year: number`.

Chování:
- Tlačítko s ikonou `Download` / `Share2` (lucide-react) v pravém horním rohu nad obsahem.
- Po kliknutí:
  1. Zavolá `toBlob(targetRef.current, { pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor, cacheBust: true })`.
  2. Pokud je dostupné `navigator.canShare({ files: [...] })` (mobil/PWA), otevře nativní sdílecí dialog s PNG souborem `esko-statistiky-{rok}.png` a popiskem "Statistiky klubu ESKO.cc {rok}".
  3. Jinak stáhne soubor přes `URL.createObjectURL` + neviditelný `<a download>`.
- Během generování: `loading` stav s toast notifikací "Připravuji obrázek…" a po dokončení "Obrázek uložen".
- Ošetřit chybu (toast destructive) — zejména CORS problém u Strava avatarů.

### 3. Zapojení v `Statistics.tsx`
- Vytvořit `const exportRef = useRef<HTMLDivElement>(null)`.
- Obalit sekci s obsahem výzvy (klubový cíl + kategorie + ClubSummaryStats + žebříček) tímto ref.
- Nad obsah (v hlavičce stránky vedle `HelpCircle` tlačítka, resp. pod ním) přidat `<StatisticsExportButton targetRef={exportRef} year={currentYear} />` — viditelné pouze pro členy.
- Přidat viditelný pouze pro export "vodoznak" / patičku uvnitř ref containeru: malý řádek s logem/textem "ESKO.cc · {datum}" ve spodní části. Skrytý v normálním zobrazení pomocí `hidden data-export-only` a při exportu dočasně zobrazit (přepnutím třídy před `toBlob` a zpět po dokončení).

### 4. Ošetření CORS pro obrázky
Strava CDN a Supabase avatary musí mít `crossOrigin="anonymous"`, jinak html-to-image nedokáže vykreslit avatary a pád PNG. Přidat `crossOrigin="anonymous"` do `<AvatarImage>` v žebříčku (přes wrapper nebo přímo v `Statistics.tsx`). Pokud některý CDN neposílá CORS hlavičky, html-to-image tichý fallback: použije `useCORS: true` + `imagePlaceholder` (prázdný avatar s iniciálami).

### 5. Ovládání viewportu při exportu
Před `toBlob`:
- Dočasně přidat na kořen `data-exporting="true"`.
- V `index.css` (nebo Tailwind arbitrary) upravit `[data-exporting] .hover\:...` na neutrální stav, aby v obrázku nebyly zbytky hoveru.
- Nastavit `width` na `targetRef.current.scrollWidth` a `height` na `scrollHeight`, aby se zachytila celá stránka i mimo viewport.

### 6. Analytika / žádná
Bez sledování — pouze client-side.

## Technické detaily

**Použité API:**
- `html-to-image` — `toBlob(node, options)`.
- `navigator.share` + `navigator.canShare({ files })` — s file fallbackem.
- Toast: existující `useToast` hook.
- Ikony: `Download`, `Share2` z `lucide-react`.

**Rozsah změn:**
- `src/components/statistics/StatisticsExportButton.tsx` (nová)
- `src/pages/Statistics.tsx` (přidat ref, tlačítko, export-only footer)
- `package.json` (nová dependence)

## Výsledek
Člen klubu klikne na "Exportovat" a dostane PNG (typicky ~2000×3000 px, retina) obsahující kompletní přehled statistik. Na mobilu se otevře nativní sdílecí dialog, na desktopu se soubor stáhne. Ideální pro sdílení do WhatsApp/Messenger skupiny klubu.
