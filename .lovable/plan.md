## Proč nevidíš /pruvodce-beskydy

Route je v kódu správně definovaná (`App.tsx` → `ROUTES.GUIDE_BESKYDY = '/pruvodce-beskydy'`), stránka `src/pages/PruvodceBeskydy.tsx` i všechny assety existují.

Z konzolového logu je vidět, že prohlížeč načítá **starý buildovaný bundle** (`index-CbzT9YWb.js`, `NotFound-ChkWJafP.js`) z `id-preview--…lovable.app`. Ten byl vytvořen ještě před přidáním této routy, takže React Router pro `/pruvodce-beskydy` spadne do catch-all `*` → `NotFound`.

Jinými slovy: kód je OK, jen **publikovaný/nasazený build je zastaralý**.

## Plán

1. **Re-publish v Lovable** – přebuilduje preview bundle, nová routa se dostane do `index-*.js`. Po publishi `/pruvodce-beskydy` bude na `id-preview--…lovable.app` i na `eskocc.lovable.app` fungovat.
2. **Re-deploy na Active24** – GitHub Action po push na `main` přebuildí `dist/` a nahraje na FTP, takže i `www.eskocc.cz/pruvodce-beskydy` se aktualizuje.
3. **Ověření** – po publishi otevřít `/pruvodce-beskydy` a zkontrolovat, že se načte nová verze JS (jiný hash než `CbzT9YWb`) a stránka se vyrenderuje.

## Co dělat nechci

- Neměnit `App.tsx` / `routes.ts` – jsou v pořádku.
- Nesahat na `NotFound` – chová se správně, jen dostává neexistující routu z prošlého buildu.
- Nepřidávat `_redirects` ani jiné hosting configy – Lovable SPA fallback funguje sám.

Pokud chceš, abych po přepnutí do build módu jen znovu spustil publish a deploy (případně přidal drobnou změnu, která vynutí rebuild), dej vědět.