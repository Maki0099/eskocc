

## Sjednocení role-checku pro upload do `gallery` bucketu

### Problém
Storage policy povoluje upload jakémukoli `authenticated` uživateli (včetně `pending`). Table-level INSERT na `gallery_items` to sice blokuje, ale soubor už je nahraný v storage = orphaned files + obejití role gate.

### Oprava
Migrace, která:
1. Dropne starou INSERT policy `Authenticated users can upload gallery photos` na `storage.objects` pro bucket `gallery`.
2. Vytvoří novou s kontrolou rolí: `member` / `active_member` / `admin`.

```sql
DROP POLICY IF EXISTS "Authenticated users can upload gallery photos" ON storage.objects;

CREATE POLICY "Members can upload gallery photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND (
    public.has_role(auth.uid(), 'member'::app_role)
    OR public.has_role(auth.uid(), 'active_member'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
```

### Beze změny
- SELECT/DELETE/UPDATE policies na `storage.objects` pro `gallery` — nejsou v scope findingu.
- Table-level RLS na `gallery_items` — už je správně.
- Žádný klientský kód — upload flow zůstává, jen bude nyní 403 pro `pending` uživatele (což je žádoucí).

### Po nasazení
Označit finding `gallery_storage_any_authenticated_upload` jako vyřešený.

