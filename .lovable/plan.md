

## Drag-and-drop řazení interních fotek v galerii

### Cíl
Umožnit ručně přeuspořádat pořadí fotek v `/galerie`. Spravované přes nový admin panel (drag-and-drop), zobrazené ve veřejné galerii podle nastaveného pořadí.

### Změny v databázi
Migrace tabulky `gallery_items`:
- Přidat sloupec `sort_order INTEGER NOT NULL DEFAULT 0`
- Backfill: existujícím fotkám přiřadit `sort_order` podle pořadí `created_at DESC` (0, 1, 2, …) — nejnovější fotky budou nahoře, jako teď.
- Index na `sort_order` pro rychlé řazení.

### Změny v aplikaci

**1. Nový admin tab „Fotky" (`/admin` → Fotky)**
Nová komponenta `src/components/admin/GalleryPhotosAdmin.tsx`:
- Načte všechny fotky z `gallery_items` seřazené podle `sort_order ASC`.
- Zobrazí seznam s drag-handle (`GripVertical`), náhledem (cca 80×80), titulkem (caption nebo „Bez popisu"), jménem autora, datem nahrání a tlačítkem smazat.
- Filtr/přepínač: **Všechny / Z vyjížděk (event_id) / Ostatní (bez event_id)** — řazení se ukládá globálně přes všechny fotky bez ohledu na filtr (filter je jen view).
- Drag-and-drop přes `@dnd-kit` (stejný pattern jako `SortableAlbumItem`/`SortableMenuItem`):
  - `DndContext` + `SortableContext` + `PointerSensor` (8px activation)
  - Po dropu `arrayMove` → batch UPDATE všech přesunutých řádků s novým `sort_order`.
- Nová sortable item komponenta `src/components/admin/SortableGalleryPhotoItem.tsx` (analogie k `SortableAlbumItem`).

**2. Nový tab v `Admin.tsx`**
Přidat `<TabsTrigger value="gallery">` s ikonou `Image` (lucide), uvnitř `<TabsContent value="gallery">` renderovat `<GalleryPhotosAdmin />`.

**3. Galerie pro členy (`src/pages/Gallery.tsx`)**
Změnit dotaz z `.order("created_at", { ascending: false })` na `.order("sort_order", { ascending: true }).order("created_at", { ascending: false })` (sekundární řazení pro stabilní pořadí u nových fotek se stejným `sort_order`).

**4. Auto-přiřazení `sort_order` při uploadu**
V `src/components/gallery/PhotoUpload.tsx` při vytvoření nové fotky přiřadit `sort_order = -1` (nebo `MIN(sort_order) - 1`), aby se nová fotka objevila jako první (nahoře). Alternativa: `sort_order = 0` a admin si může přesunout — doporučuji **`-1`** (nejnovější nahoře, intuitivní).

### Co se NEmění
- Komponenta `PhotoGrid.tsx` (frontend grid v galerii) — pořadí přijde už seřazené z dotazu.
- RLS policies — admin už má `has_role('admin')` práva na update přes existující politiky? **Pozor:** `gallery_items` aktuálně **nemá UPDATE policy** — je tam jen INSERT a DELETE. Migrace musí přidat policy „Admins can update gallery items" pro `UPDATE` s `has_role(auth.uid(), 'admin')`.

### Technické detaily
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` už v projektu jsou (používá je admin alb i menu).
- Batch update: pro N přesunutých řádků provést N samostatných `UPDATE` přes Promise.all (stejný pattern jako `ExternalAlbumsAdmin`). U galerie s desítkami až stovkami fotek je to OK; pokud by jich byly tisíce, řešilo by se RPC funkcí — teď ne.
- Filtr v adminu je čistě view-side — `sort_order` je globální napříč všemi fotkami (jednodušší než per-kategorie pořadí).

### Soubory
**Nové:**
- `supabase/migrations/<timestamp>_gallery_items_sort_order.sql`
- `src/components/admin/GalleryPhotosAdmin.tsx`
- `src/components/admin/SortableGalleryPhotoItem.tsx`

**Upravené:**
- `src/pages/Admin.tsx` (nový tab)
- `src/pages/Gallery.tsx` (řazení)
- `src/components/gallery/PhotoUpload.tsx` (auto sort_order pro nové fotky)

