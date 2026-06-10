## Cíl
Umožnit adminovi editovat obsah `/pruvodce-beskydy` (seznam tras a metadata) a nahrávat reálné GPX soubory přes formulář, bez zásahu do kódu.

## Co se změní

### 1. Databáze — nová tabulka `beskydy_routes`
Migrace s tabulkou, GRANTy, RLS a triggerem `updated_at`.

Sloupce:
- `id` uuid PK
- `slug` text unique (např. `lysa-hora-z-krasne`) — používá se v URL GPX souboru a jako klíč
- `title` text
- `start_location` text
- `distance_km` integer
- `elevation_m` integer
- `terrain` text (`road` / `gravel` / `mtb`)
- `difficulty` text (`easy` / `medium` / `hard`)
- `description` text
- `gpx_path` text (cesta v Storage bucketu — viz níže)
- `mapy_url` text nullable
- `komoot_url` text nullable
- `sort_order` integer (řazení karet na stránce)
- `is_published` boolean default true (skrytí bez mazání)
- `created_at`, `updated_at` timestamptz

RLS politiky:
- **SELECT** pro `anon` i `authenticated` jen `WHERE is_published = true` → stránka `/pruvodce-beskydy` je veřejná
- **ALL** (insert/update/delete) jen pro `admin` přes `has_role(auth.uid(), 'admin')`
- GRANT podle vzoru z projektových pravidel

Seed: insert 6 současných tras z `src/data/beskydyRoutes.ts` (popisy, čísla, mapy/komoot odkazy, `gpx_path` zatím ukazující na stávající soubory v `public/gpx/beskydy/...` — fungují dál, dokud admin nenahraje nový).

### 2. Storage bucket `beskydy-gpx` (veřejný)
- Vytvoření přes storage tool, `public: true` (aby `<a download>` a Mapbox Static / GPX parser mohly načíst soubor přímo z CDN URL bez tokenu)
- RLS na `storage.objects`:
  - SELECT veřejně (bucket je public)
  - INSERT / UPDATE / DELETE jen pro `admin` v daném bucketu

### 3. Edge function `beskydy-gpx-validate` (volitelná, doporučená)
Krátká funkce, která po uploadu načte XML z bucketu, ověří že obsahuje aspoň 2 `<trkpt>` body, spočítá délku a převýšení z bodů a vrátí je adminovi jako návrh hodnot pro pole „Vzdálenost" / „Převýšení". Admin čísla potvrdí/přepíše.

(Pokud bys to chtěl jednodušší, lze parsovat klientsky v adminu — bez edge funkce. Doporučuji klientsky, ušetří jeden round-trip a žádný nový secret.)

**→ Půjdu cestou bez edge funkce, parsing GPX dělám v prohlížeči** (stejnou logikou jako už máme v `RouteGpxPreview.tsx`).

### 4. Nová admin záložka „Beskydy"
Nový soubor `src/components/admin/BeskydyRoutesAdmin.tsx`, přidaný do `src/pages/Admin.tsx` jako další `TabsTrigger` + `TabsContent` (vedle „Routes", „Café" apod.). Ikona `Mountain` z lucide.

Funkce:
- **Tabulka tras** se slugem, názvem, km, m, terénem, obtížností, stavem publikace a akcemi (edit / smazat / posunout nahoru-dolů pro `sort_order`).
- **Tlačítko „Přidat trasu"** → dialog s formulářem (zod validace):
  - název, slug (auto-generovaný z názvu, editovatelný), start, popis (textarea), terén/obtížnost (Select), Mapy.cz a Komoot URL, publikováno (Switch)
  - **GPX upload** (povinný při vytvoření): `<input type="file" accept=".gpx,application/gpx+xml">` → po výběru se soubor klientsky zparsuje (DOMParser, stejně jako v `RouteGpxPreview`), spočítá se délka a kumulované převýšení z `<ele>` bodů a předvyplní pole „Vzdálenost km" a „Převýšení m" (zaokrouhleno na celé — viz core memory). Admin může přepsat. Soubor se nahraje do bucketu na cestu `routes/{slug}.gpx`.
- **Editace existující trasy**: stejný dialog předvyplněný; GPX upload je volitelný (nahradí stávající).
- **Smazání**: confirm dialog, smaže řádek + soubor v Storage.

### 5. Úpravy `/pruvodce-beskydy`
- `src/pages/PruvodceBeskydy.tsx`: nahradit `import { BESKYDY_ROUTES } from "@/data/beskydyRoutes"` za `useQuery` (TanStack) → `supabase.from("beskydy_routes").select(...).eq("is_published", true).order("sort_order")`.
- Mapování DB řádku na stávající tvar, který komponenty na stránce očekávají (jen rename polí — `distance_km` → `distanceKm`, `gpx_path` → public URL z `supabase.storage.from("beskydy-gpx").getPublicUrl(...)`).
- Loading skeleton během načítání (zachovat současný layout).
- `BeskydyOverviewMap` dostává stejný seznam s `gpxUrl` jako dnes — beze změny komponenty.
- **Smazat** `src/data/beskydyRoutes.ts` (až po migraci a ověření, že seed proběhl) — content je teď v DB.

## Beze změny
- `src/components/map/RouteGpxPreview.tsx` — funguje nad libovolným `gpxUrl`.
- `src/components/map/BeskydyOverviewMap.tsx` — totéž.
- `public/gpx/beskydy/*.gpx` — můžou tam zůstat jako fallback, dokud admin nenahradí (pak je lze ručně smazat).
- Stávajících 6 záznamů — seedem se zachovají i s popisy a metadaty.

## Technické detaily
- TanStack Query už v projektu je, použiji `@tanstack/react-query`.
- Slug generátor: `title.toLowerCase()` → diakritika přes `normalize("NFD").replace(/[\u0300-\u036f]/g, "")` → mezery `→ -` → ořezat nealfanumerické. Pole je editovatelné, validace `/^[a-z0-9-]+$/`.
- GPX parsing v adminu: jednoduchá funkce, Haversine vzdálenost mezi po sobě jdoucími `<trkpt>` (km), součet kladných rozdílů `<ele>` mezi body (převýšení m). Vrací rovnou int (Math.round).
- Veřejné URL z bucketu: `supabase.storage.from("beskydy-gpx").getPublicUrl("routes/" + slug + ".gpx").data.publicUrl`. Žádný signed URL — bucket je public, GPX jsou neutajitelná data.
- Cache busting po nahrazení GPX: k URL připojím `?v={updated_at_timestamp}`, aby Mapbox Static API a `<a download>` netáhly starý cache.
- Admin gating: záložka se vykreslí jen pro `isAdmin` (stejný vzor jako ostatní admin záložky).

## Out of scope
- Editace dlouhého textu stránky (úvodní sekce, FAQ, TOC, blogový obsah) — zůstává v kódu. Pokud bys to chtěl později, je to samostatná migrace `beskydy_page_content` + WYSIWYG editor.
- Editace hero obrázku / fotek v sekci — zůstávají importované assety.
- Mazání starých `public/gpx/beskydy/*.gpx` z repa — admin si je může po nahrazení nechat ručně promazat, nebo to udělám další iterací.

## Po nasazení
1. Otevři Admin → záložka „Beskydy".
2. U každé z 6 tras klikni „Upravit" → nahraj reálný GPX → potvrď automaticky spočítané km/m → ulož.
3. Stránka `/pruvodce-beskydy` ihned ukáže nové GPX (download tlačítko, mini mapa, přehledová mapa).
