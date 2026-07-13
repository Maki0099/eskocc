## Diagnóza (URL Inspection API — právě proběhla)

| URL | Stav | Poznámka |
|---|---|---|
| `/` | **Submitted and indexed** ✅ | Crawl 11. 7. 2026, mobile, canonical OK |
| `/events` | **Discovered – currently not indexed** | Google URL zná, ale ještě nezaindexoval |
| `/pruvodce-beskydy` | **Discovered – currently not indexed** | Totéž |
| `/about` | **Not found (404)** ❌ | Poslední crawl 10. 6. 2026 — starý, ještě před opravou SPA fallbacku. Dnes už `/about` vrací 200. |

**Závěr:** Search Console **funguje správně**. Nejde o technickou závadu — indexace jednotlivých URL je pomalá kombinace tří věcí:

1. **Web je čistý client-side React SPA.** Googlebot musí spustit JS, aby viděl obsah. Bez SSR/prerenderu je initial HTML skoro prázdné (`<div id="root"></div>`). Google to indexuje, ale s velkou latencí a nižší prioritou → typický efekt „Discovered – currently not indexed".
2. **Doména je nová v indexu**, málo externích odkazů, málo signálu → Google si dává na čas s bulk indexací.
3. **Starý cache stav u `/about`** (crawl z doby, kdy tam byla 404).

## Postup

### 1. Re-request indexace u problémových URL
Přes URL Inspection API zavolat `index:submitInspection` (Request Indexing) pro:
- `/about` (přepsat 404 crawl)
- `/events`
- `/pruvodce-beskydy`
- `/statistiky`, `/cafe`, `/gallery`

Poznámka: Search Console má denní limit ~10 requestů; víc než 10 URL najednou nemá smysl.

### 2. Přidat prerendering statických SPA stránek (klíčová oprava)
Bez toho zůstane většina URL v „Discovered — currently not indexed" i za měsíce. Dvě možnosti:

**A) `vite-plugin-prerender` / `react-snap`** (doporučeno, malý zásah)
- Přidat do `vite.config.ts` prerender pro routes: `/`, `/events`, `/pruvodce-beskydy`, `/about`, `/cafe`, `/gallery`, `/statistiky`, `/install`, `/dokumenty`, `/login`, `/register`.
- Build vygeneruje pro každou routu skutečné `dist/<route>/index.html` s hotovým HTML (H1, texty, meta). Klient pak převezme React.
- SPA fallback v `.htaccess` zůstane pro dynamické routes (`/member/:id`, `/event/:id`).

**B) Přejít na SSR (TanStack Start / Next-like stack)** — velký refactor, teď nedoporučuji.

Doporučuji **A**.

### 3. Ověřit, že SPA fallback vrací **200**, ne 404
V `public/.htaccess` je `ErrorDocument 404 /index.html` — to znamená, že Apache vrací **404 status** s tělem `index.html`. Googlebot pak stránku vidí jako 404 a nezaindexuje ji.

Oprava: nechat pouze `RewriteRule . /index.html [L]` (což už tam je — status vrácený tímto pravidlem je 200) a **odstranit `ErrorDocument 404 /index.html`**, nebo ho změnit tak, aby fallback vracel 200. Toto je pravděpodobně důvod, proč `/about` bylo 10. 6. viděné jako 404.

### 4. Zkontrolovat obsah initial HTML
Po prerenderu ověřit `curl -A "Googlebot" https://www.eskocc.cz/pruvodce-beskydy`, že v odpovědi je H1 a hlavní text bez JS.

### 5. Počkat 1–4 týdny a znovu spustit URL Inspection
Indexace se zrychlí, jakmile Googlebot uvidí plnohodnotný HTML obsah.

## Co plán NEobsahuje
- Neměním sitemap ani robots.txt — jsou v pořádku.
- Neinstaluji SSR framework.
- Negeneruji backlinks / off-page SEO.

## Otázka před spuštěním
Chceš, abych ve fázi 2 použil **`vite-plugin-prerender`** (jednoduchá integrace do stávajícího Vite buildu) pro těch ~11 statických routes, plus opravil `.htaccess` fallback (bod 3) a odeslal re-index requesty (bod 1)?
