# Modální výzva „Propojit Stravu"

## Cíl
Člena bez propojené Stravy po přihlášení upozorní výrazné modální okno. Jedním kliknutím se dostane rovnou k propojení účtu, nemusí nic hledat.

## Jak to bude fungovat
- Po přihlášení se na nástěnce členu bez propojení (nebo s vypršelým propojením) zobrazí **modální okno**:
  - Nadpis „Propoj si Stravu" (u vypršelého propojení „Propojení se Stravou vypršelo")
  - Stručné vysvětlení: bez propojení se kilometry a převýšení nepočítají do statistik klubu
  - Velké tlačítko **Propojit Stravu** → přesměruje rovnou na autorizaci Stravy (uživatel jen potvrdí přístup na stránce Stravy a vrátí se zpět)
  - Druhé tlačítko **Později** → okno zavře a znovu se ukáže za 7 dní (stejné chování jako u výzvy k notifikacím, uloženo v prohlížeči)
- Okno se zobrazí jen jednou během přihlášení, nebude se opakovat při každém přepnutí stránky.
- Stávající pasivní výzva na nástěnce (`StravaConnectPrompt`) zůstane jako trvalá připomínka.

## Technické poznámky
- Nová komponenta `src/components/strava/StravaConnectModal.tsx`:
  - Kontrola stavu: dotaz na `user_strava_tokens` podle přihlášeného uživatele (stejně jako `StravaConnectPrompt`).
  - `Dialog` z `@/components/ui/dialog`; zapamatování „Později" přes `localStorage` s klíčem `strava_connect_later_<userId>` (návrat po 7 dnech).
  - Tlačítko „Propojit Stravu" volá edge funkci `user-strava-auth` stejně jako `StravaConnectionCard.handleConnect()` a přesměruje na vrácené OAuth URL. Pokud volání selže, fallback přejde na `/account`.
  - Logika OAuth volání se přesune do sdíleného helperu (např. `startStravaOAuth()` v `src/lib/strava-oauth.ts`), aby ji používaly modal i karta v nastavení účtu.
- Zapojení do `src/pages/Dashboard.tsx` (vedle `StravaConnectPrompt`), jen pro role mimo `pending`.
- Žádná migrace databáze ani změny backendu.

## Ověření
- Přihlášený člen bez propojení vidí po příchodu na nástěnku okno; „Propojit Stravu" vede na autorizaci Stravy.
- „Později" okno zavře a do 7 dnů se nezobrazí; pak se znovu ukáže.
- Člen s funkčním propojením okno nikdy nevidí; člen s vypršelým vidí variantu „vypršelo".
- Build čistý, ověření v náhledu (desktop i mobil).
