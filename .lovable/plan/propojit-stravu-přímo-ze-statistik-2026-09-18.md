# Propojit Stravu přímo ze statistik

## Cíl
V žebříčku statistik je u nepropojených členů text „Nepropojená Strava“ / „Propoj si Stravu“. Upravit tento prvek tak, aby vedl k připojení Stravy — pro přihlášeného uživatele jako výzva s odkazem, pro ostatní jako informativní štítek.

## Změny

### Frontend
Soubor: `src/pages/Statistics.tsx`

- Upravit blok na řádcích 433–438, kde se vykresluje `!member.is_connected`.
- Pro `isCurrentUser` zobrazit klikací tlačítko/odkaz směřující na `/account` (sekce Strava) s textem „Propojit Stravu“.
- Pro ostatní nepropojené členy ponechat štítek „Nepropojená Strava“ (neinteraktivní), případně doplnit malou ikonu informace.
- Zachovat existující barvu a velikost písma.

## Ověření
- Žebříček statistik se načte bez chyby.
- U přihlášeného nepropojeného člena se zobrazí klikací výzva „Propojit Stravu“.
- Kliknutí přesměruje na stránku účtu (`/account`).
- U ostatních členů zůstane pasivní štítek.
