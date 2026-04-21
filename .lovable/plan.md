

## Přidání nového Google Photos alba do galerie

### Stav teď
Alba jsou hardcoded v `src/pages/Gallery.tsx` v poli `externalAlbums` (4 alba: Mallorca 2022–2025). Cover obrázky jsou statické importy z `src/assets/albums/*.jpg`. Pro každé nové album je potřeba zásah do kódu **a** nahrání cover fotky do repa.

### Dvě možnosti — vyber jednu

---

### Varianta A — Rychle: přidat další album do kódu (5 minut)

Vhodné, pokud alba přibývají max 1–2× ročně a nevadí, že to dělá vývojář.

**Co udělám:**
1. Ty mi dodáš:
   - Název alba (např. „Mallorca 2026")
   - Sdílecí URL z Google Photos (`https://photos.app.goo.gl/...`)
   - Cover obrázek (JPG, ideálně 1600×900, max 500 KB) — nahraj do chatu
2. Já:
   - Uložím obrázek do `src/assets/albums/<slug>.jpg`
   - Přidám položku do pole `externalAlbums` v `Gallery.tsx` (nahoru, aby bylo nejnovější první)

**Soubory:** `src/pages/Gallery.tsx` + nový soubor v `src/assets/albums/`.

---

### Varianta B — Lépe: admin panel pro správu alb (≈ 1 hodina práce)

Vhodné, pokud chceš alba přidávat sám/sama bez vývojáře, případně častěji.

**Co vytvořím:**

1. **DB migrace** — nová tabulka `external_albums`:
   - `id`, `title`, `url`, `cover_image_url`, `sort_order`, `year` (int, nullable, pro řazení), `created_at`
   - RLS: SELECT pro všechny (alba se ukazují i nečlenům? — viz otázka níž), INSERT/UPDATE/DELETE jen admin
   - Seed: naimportuju 4 stávající alba

2. **Storage** — nový bucket `album-covers` (public), nebo využiju existující `gallery` bucket s prefixem `albums/`

3. **Admin UI** — nová karta v `/admin` „Externí alba":
   - Tabulka s aktuálními alby (drag-and-drop pořadí pomocí `@dnd-kit`, stejně jako u menu items)
   - Formulář „Přidat album": title, URL, upload cover image (s preview), rok
   - Edit + smazat u každého řádku

4. **Refactor `Gallery.tsx`**:
   - Místo hardcoded pole načtu `external_albums` ze Supabase přes `useQuery`
   - Skeleton během načítání
   - Zachovám stávající vizuál (grid 3 sloupce, hover efekty, scroll animace)

5. **Smazat** statické soubory `src/assets/albums/*.jpg` po migraci do Storage.

**Soubory:**
- `supabase/migrations/<ts>_external_albums.sql` (tabulka + RLS + seed + storage policy)
- `src/components/admin/ExternalAlbumsAdmin.tsx` (nový)
- `src/pages/Admin.tsx` (přidat tab)
- `src/pages/Gallery.tsx` (načítat z DB)
- `src/hooks/useExternalAlbums.ts` (nový — query hook)

---

### Otázky k vyjasnění (jen pro variantu B)

1. **Viditelnost alb** — mají být Google Photos alba viditelná i pro nečleny (anonymous návštěvníci homepage/galerie)? Aktuálně je celá `Gallery` stránka člensky chráněná přes `MemberOnlyContent`, takže alba stejně vidí jen členové. Necháváme stejně, nebo chceš alba zobrazit i veřejně?

2. **Má jít cover obrázek nahrát i jako URL** (ne jen upload), pro případ, že by chtěl admin použít obrázek přímo z Google Photos? Default doporučuji jen upload (jednodušší, cache-friendly).

