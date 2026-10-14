# Soustředění Mallorca – stránka s trasami

## Co uvidí člen
- Nová stránka **Mallorca** (`/mallorca`), jen pro přihlášené členy, odkaz v menu pro členy.
- Nahoře velká mapa ve stylu Mapy klubu se **všemi trasami najednou** (každá trasa jinou barvou, startovní body). Klik na trasu ji zvýrazní, ostatní zeslabí, a nabídne přechod na její detail.
- Pod mapou **seznam tras** (karty): foto, název, vzdálenost, převýšení, obtížnost. Najetí/klik na kartu zvýrazní trasu na mapě.
- **Detail trasy** (`/mallorca/:slug`): velká fotka, galerie fotek, popis, interaktivní mapa trasy s výškovým profilem, tlačítka **Stáhnout GPX** a **Otevřít v Mapy.cz**, návod jak trasu nahrát do Garminu, šipky na předchozí/další trasu.

## Správa v administraci
- Nová záložka **Mallorca trasy**: přidat/upravit/smazat trasu, nahrát GPX (vzdálenost a převýšení se spočítají automaticky), název, popis, obtížnost, terén, den soustředění, odkaz Mapy.cz, pořadí, zveřejnit/skrýt.
- Fotky: nahrát vlastní (více, s pořadím); u trasy bez fotky tlačítko **Vygenerovat AI fotku** (stejný mechanismus jako u importu tras).

## Postup
1. Databáze: tabulka tras + fotek, úložiště pro GPX a fotky.
2. Administrace tras a fotek.
3. Přehledová stránka s mapou všech tras a seznamem.
4. Detail trasy.
5. Nahraješ své GPX a texty, ověříme v prohlížeči.

## Technické poznámky
- Tabulky `camp_routes` (slug, title, description, distance_km, elevation_m, difficulty, terrain, camp_day, gpx_path, mapy_url, cover_image_url, sort_order, is_published) a `camp_route_photos` (route_id, file_url, caption, sort_order, is_ai). Volitelně sloupec `camp` (text, výchozí „mallorca-2026") pro budoucí soustředění. GRANT authenticated + service_role; RLS: čtení pro role member/active_member/admin, zápis jen admin přes `has_role`.
- Úložiště: privátní bucket `camp-routes` (GPX + fotky), čtení pro členy, zápis admin.
- Mapa: Mapbox GL jako `ClubMap.tsx`, GPX parsování přes `gpx-utils.ts`, detail mapy přes `GpxMap.tsx`; vzdálenost/převýšení zaokrouhleny na celá čísla.
- AI fotky přes existující edge funkci generování obrázků; priorita: vlastní foto → AI.
- Routy v `src/lib/routes.ts`, odkaz v `MEMBER_NAV_ITEMS`, stránky obalené kontrolou členství.
