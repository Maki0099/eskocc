## Cíl
V admin panelu (`/admin`, záložka Uživatelé) zobrazit u každého uživatele indikátor, zda má propojený **vlastní Strava účet** (záznam v `user_strava_tokens`) — vedle stávajícího klubového athlete mappingu.

## Změny

**`src/pages/Admin.tsx`**

1. Rozšířit typ `UserWithRole` o `hasPersonalStrava: boolean`.
2. Ve `fetchUsers()` přidat dotaz:
   ```ts
   const { data: tokens } = await supabase
     .from("user_strava_tokens")
     .select("user_id");
   ```
   (admin policy už čtení povoluje) a vytvořit `Set<string>` user_ids; při mapování profilů nastavit `hasPersonalStrava`.
3. V renderu řádku uživatele (kolem ř. 455, vedle bloku „klubový athlete") přidat malý badge:
   - Pokud `hasPersonalStrava` → oranžový badge `SiStrava` ikona + text „Vlastní Strava" (tooltip „Uživatel má propojený svůj Strava účet").
   - Jinak nic nebo decentní „—".
4. Přidat do horního souhrnu (vedle počtu napárovaných, ř. 385) nový čítač: „Vlastní Strava: X".

## Bez změn
- RLS / DB / edge funkce — vše už je nastaveno.
- Žádné nové secrets, žádné migrace.
