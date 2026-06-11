# Oprava občasných 404 na `/pruvodce-beskydy` (a dalších podstránkách)

## Příčina

Web `www.eskocc.cz` je publikován na **Active24** (Apache server) přes FTP deploy z `.github/workflows/deploy.yml`. Aplikace je SPA (React Router, `BrowserRouter`) – existuje pouze `index.html`, ostatní routy (jako `/pruvodce-beskydy`, `/events`, `/dashboard`, …) jsou pouze v JS routeru.

Při kliku v menu funguje vše OK (client-side navigace). Ale když uživatel:

- otevře odkaz `/pruvodce-beskydy` přímo,
- dá refresh (F5),
- otevře link ze sdílení / Googlu / záložky,

Apache hledá fyzický soubor `/pruvodce-beskydy`, nenajde ho a vrátí **404**. V projektu chybí `.htaccess` s SPA fallbackem – proto se to děje "občas" (jen u přímých návštěv / refreshe).

> Pozn.: Na Lovable preview a `*.lovable.app` to funguje, protože tam SPA fallback řeší hosting automaticky. Active24 ne.

## Řešení

Přidat `public/.htaccess`, který Vite zkopíruje do `dist/` při buildu a FTP deploy ho nahraje do rootu webu. Pravidla:

1. **SPA fallback** – pokud requestovaná cesta není existující soubor/složka a není to `/api`, `/documents`, asset s příponou, atd., přepsat na `/index.html` (HTTP 200, ne redirect).
2. **Vyjímky** – nechat průchod pro reálné soubory (`sitemap.xml`, `robots.txt`, `/documents/*.pdf`, `/gpx/*`, PWA ikony, `sw.js`, `sw-push.js`, `manifest.webmanifest`).
3. **Cache hlavičky** – konzistentní s tím, co už řešíme v `UpdatePrompt`/`vite.config.ts`:
   - `index.html`, `sw.js`, `sw-push.js`, `manifest.webmanifest` → `Cache-Control: no-cache, must-revalidate` (klient vždy ověří novou verzi).
   - Hashované assety v `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`.
4. **Gzip/Brotli** kompresi a bezpečnostní hlavičky (`X-Content-Type-Options`, `Referrer-Policy`) – drobné vylepšení při této příležitosti.

## Změny

- **Nový soubor:** `public/.htaccess` s pravidly výše.
- **Beze změny** zůstává `vite.config.ts`, router i `deploy.yml` – Vite kopíruje obsah `public/` 1:1 do `dist/`, takže `.htaccess` se nasadí automaticky při příštím pushi do `main`.

## Ověření po nasazení

- Otevřít https://www.eskocc.cz/pruvodce-beskydy přímo v novém tabu → musí načíst stránku (200), ne 404.
- Refresh (F5) na `/events`, `/dashboard`, `/member/...` → musí fungovat.
- `https://www.eskocc.cz/sitemap.xml` a `/documents/*.pdf` → musí stále vracet reálné soubory, ne `index.html`.

## Technické detaily (htaccess kostra)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # nepřepisovat existující soubory/složky
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # nepřepisovat dokumenty, gpx, sitemap, robots, sw, manifest
  RewriteRule ^(documents|gpx)/ - [L]
  RewriteRule ^(sitemap\.xml|robots\.txt|sw\.js|sw-push\.js|manifest\.webmanifest|favicon\.ico)$ - [L]

  # všechno ostatní → index.html
  RewriteRule . /index.html [L]
</IfModule>
```

Plus cache + komprese bloky popsané výše.
