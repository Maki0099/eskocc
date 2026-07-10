## Kontext

Search Console konektor je připojen. Zbývá dokončit poslední otevřený SEO finding `gsc:gsc` — ověřit vlastnictví domény a odeslat sitemap. Web má vlastní doménu `www.eskocc.cz` (v `sitemap.xml`, `robots.txt` i og:url) a zároveň Lovable doménu `eskocc.lovable.app`.

## Postup

1. **Zjistit ověřené property** — zavolat `GET /webmasters/v3/sites` přes gateway a podívat se, co už uživatel v Search Console má (často je `sc-domain:eskocc.cz` už verifikované z dřívějška — pak nemusíme nic přidávat).

2. **Podle výsledku jedna ze dvou větví:**

   **A) Doména `eskocc.cz` už je verifikovaná** → přeskočíme verifikaci a jdeme na krok 3.

   **B) Není verifikovaná** → přidat meta‑tag verifikaci pro `https://www.eskocc.cz/`:
   - `POST /siteVerification/v1/token` s `{"site":{"identifier":"https://www.eskocc.cz/","type":"SITE"},"verificationMethod":"META"}`
   - Vložit vrácený `<meta name="google-site-verification" …>` do `index.html` (dva starší tokeny už tam jsou — přidáme třetí, žádný nemažeme).
   - Po publikaci zavolat `POST /siteVerification/v1/webResource?verificationMethod=META`.
   - Zaregistrovat property: `PUT /webmasters/v3/sites/https%3A%2F%2Fwww.eskocc.cz%2F`.

3. **Odeslat sitemap** k ověřené property:
   - `PUT /webmasters/v3/sites/{siteUrl}/sitemaps/https%3A%2F%2Fwww.eskocc.cz%2Fsitemap.xml`

4. **Ověřit indexaci homepage** přes URL Inspection API (`POST /v1/urlInspection/index:inspect`) — vrátí, zda Google stránku už zná / plánuje indexovat.

5. **Zavřít SEO finding** `gsc:gsc` přes `seo_chat--update_findings` s krátkým popisem, co bylo uděláno.

## Co plán NEobsahuje

- Neměníme `sitemap.xml` ani `robots.txt` — obsah je aktuální a odpovídá reálným routám.
- Neměníme kanonickou doménu z `www.eskocc.cz` na `eskocc.lovable.app`. Pokud bys chtěl, aby Google indexoval spíš Lovable subdoménu, řekni to a udělám z toho samostatný krok (přepsání `BASE_URL` v sitemap, og:url v `index.html` a druhá verifikace).

## Otázka před spuštěním

Chceš, abych ověřoval **`https://www.eskocc.cz/`** (produkční doména, doporučuji) nebo **`https://eskocc.lovable.app/`** (Lovable preview URL)?
