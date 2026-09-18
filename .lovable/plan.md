# Kontrola nových funkcí v mobilní aplikaci (PWA)

## Co jsem ověřil

Spustil jsem nové stránky v mobilní velikosti obrazovky (390 px) jako přihlášený člen:

- **Rekordy klubu**, **Mapa klubu**, **Profil člena** a **Nástěnka** se načtou správně, bez chyb a bez vodorovného posouvání.
- **Statistiky klubu** se zobrazují, ale stránka je o kousek širší než displej — jde jí posouvat do stran, což v aplikaci na telefonu působí rozbitě.
- Nové stránky **Mapa klubu** a **Rekordy klubu** nejsou v menu — dostat se na ně jde jen odkazem ze statistik. V nainstalované aplikaci to působí, že chybí.
- Mapa klubu si stahuje mapové podklady; ty se ukládají pro rychlejší další otevření, ale bez internetu se mapa nezobrazí.
- Offline stránka a rychlé zkratky v aplikaci zatím nové stránky neznají.

## Co navrhuji opravit

1. **Statistiky na mobilu** — odstranit přetečení do stran (přepínač Vše/Trenažér/Venku, řádky pořadí a měsíční žebříček zúžit na šířku displeje).
2. **Menu** — přidat do hlavního i mobilního menu položky **Mapa klubu** a **Rekordy klubu** (jen pro přihlášené členy, vedle Statistik), ať jsou v aplikaci dostupné napřímo.
3. **Zkratky v aplikaci** — k dlouhému podržení ikony aplikace přidat zkratku na Statistiky (už je) a nově na Rekordy klubu.
4. **Chování bez internetu** — na mapě a rekordech ukázat srozumitelnou hlášku „Data se nepodařilo načíst, zkontroluj připojení" místo prázdné stránky.
5. **Po nasazení** — ověřit na telefonu přes tlačítko Aktualizovat, protože nainstalovaná aplikace si drží starou verzi v paměti.

## Technické detaily

- Přetečení na `/statistiky`: `document.documentElement.scrollWidth` = 407 při viewportu 390. Projít `src/pages/Statistics.tsx` a `src/components/statistics/MonthlyLeaderboard.tsx` — přidat `min-w-0`, `overflow-x-auto` na tabulkové bloky, u fixní šířky jmen `w-56` použít responzivní variantu (`w-40 sm:w-56`).
- Menu: doplnit `CLUB_MAP` a `CLUB_RECORDS` do `NAV_ITEMS` v `src/lib/routes.ts` jako položky vyžadující přihlášení, případně samostatné pole `MEMBER_NAV_ITEMS`, a vykreslit je v `Header.tsx` (desktop i mobilní sheet) podle stavu přihlášení.
- Manifest `shortcuts` ve `vite.config.ts`: přidat položku pro `/rekordy-klubu`. Změna se u již nainstalovaných aplikací projeví až po přeinstalaci.
- Offline stav: v `ClubMap.tsx` a `ClubRecords.tsx` doplnit ošetření chyby načtení (`navigator.onLine` + chybový stav RPC) s tlačítkem Zkusit znovu. Service worker a jeho cachování se nemění.
