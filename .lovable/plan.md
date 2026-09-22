# Upozornění na vypršené propojení Stravy ve statistikách a administraci

## Cíl
Ve statistikách klubu a v administraci zřetelně ukázat, kterým členům přestalo fungovat osobní propojení se Stravou, a dát jim/zobrazit rychlou cestu k obnovení.

## Co se změní

### 1. Statistiky klubu (`/statistiky`)
- Každý řádek člena dostane informaci, zda má propojení a zda vypršelo.
- **Vlastní řádek (aktuálně přihlášený člen):**
  - Místo pasivního textu „Nepropojená Strava“ se zobrazí tlačítko/přímý odkaz **„Propojit Stravu“** nebo **„Propojit znovu“** pod jménem.
  - Pokud propojení vypršelo (`needs_reauth = true`), zobrazí se varování s oranžovou barvou a textem **„Propojení se Stravou vypršelo – obnovit“**.
- **Ostatní členové:**
  - Vedle jména se zobrazí drobný štítek: **Propojeno** / **Vypršelo** / **Nepřipojeno**.
  - U vypršelého propojení se po najetí zobrazí poslední známá chyba (`last_error`) a čas poslední úspěšné synchronizace.
- Volba filtru Vše/Trenažér/Venku zůstává beze změny.

### 2. Admin panel (`/admin`)
- Záložka **Strava členů** už existuje – doplní se:
  - Řádky s vypršeným propojením se zvýrazní (oranžový štítek).
  - Zobrazí se poslední chyba a čas posledního sync.
  - Přibyde souhrnná karta **„Vypršelá propojení“** s počtem členů, kteří potřebují znovu propojit.
- Na záložce **Uživatelé** se ve sloupci „Vlastní Strava“ nebude zobrazovat jen ano/ne, ale stav:
  - Propojeno
  - Vypršelo
  - Nepřipojeno

### 3. Backend
- Upravit funkci `get_member_statistics()` tak, aby vracela navíc `needs_reauth` a `last_synced_at` z tabulky `user_strava_tokens` (LEFT JOIN, SECURITY DEFINER umožňuje číst data všech členů pro přehled).
- Funkce zůstane dostupná jen přihlášeným členům (`EXECUTE` pro `authenticated`, `REVOKE` od `anon`).

## Technické kroky
1. **Migrace:**
   - Upravit `get_member_statistics()` o `LEFT JOIN user_strava_tokens` a sloupce `is_connected`, `needs_reauth`, `last_synced_at`.
2. **Frontend `src/pages/Statistics.tsx`:**
   - Rozšířit `MemberStats` interface o `needs_reauth?: boolean; last_synced_at?: string | null`.
   - Upravit zobrazení stavu propojení pod jménem člena (vlastní řádek -> odkaz na `/account`; ostatní -> štítek).
3. **Frontend `src/pages/Admin.tsx`:**
   - Rozšířit `UserWithRole` o `stravaStatus: 'connected' | 'expired' | 'none'` a načítat `needs_reauth`, `last_error`, `last_synced_at`.
   - Doplnit stavový štítek do tabulky uživatelů a souhrnnou kartu do horních statistik.
4. **Frontend `src/components/admin/MemberStravaAdmin.tsx`:**
   - Zvýraznit `needs_reauth` řádky.
   - Ukázat `last_error` (tooltip nebo rozbalení).
5. **Ověření:**
   - Build čistý.
   - V náhledu zkontrolovat, že:
     - přihlášený člen s vypršeným tokenem vidí „Propojit znovu“,
     - u ostatních členů jsou štítky správné,
     - admin tabulka a Strava členů reflektují stav.

## Omezení
- Správce nemůže obnovit propojení za člena – člen si musí Stravu propojit sám přes své nastavení účtu (`/account`).
- Upozornění se neposílá e-mailem; toto řeší jen vizuální indikaci ve statistikách a administraci.
