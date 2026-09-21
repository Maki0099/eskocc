# Vše = jen jízdy na kole

## V čem byl rozdíl (ověřeno v datech za 2026)

Volba **Vše** dosud ukazovala celkový roční součet ze Stravy — tedy **všechny sporty** (běh, chůze, turistika, skialp). Volby **Trenažér** a **Venku** počítají jen kolo. Proto součet neseděl:

| Člen | Vše (dnes) | Kolo celkem | Trenažér | Venku | Rozdíl (nekolo) |
|---|---|---|---|---|---|
| Martin Habáň | 4 113 | 3 954 | 629 | 3 325 | 159 |
| Tomáš Machalínek | 2 795 | 2 586 | 145 | 2 441 | 209 |
| Zbyněk Kúřil | 4 728 | 4 318 | 0 | 4 318 | 410 |
| Kamil Čejka | 4 698 | 4 685 | 0 | 4 685 | 13 |
| Adam Kuril | 3 277 | 3 264 | 0 | 3 264 | 13 |

## Co udělám

1. Ve **statistikách klubu** bude volba **Vše** počítat jen jízdy na kole. Pak bude platit: Trenažér + Venku = Vše.
2. Kilometry, převýšení, počet jízd i tempo k ročnímu cíli se u propojených členů budou brát z kolařských jízd, ne z celkového součtu ze Stravy.
3. **Profil člena zůstane beze změny** — ukazatele sezóny, kalendář jízd, rozpad sportů a karta „Statistiky tohoto roku" dál zahrnují všechny aktivity.
4. Pod přepínačem bude poznámka, že pořadí počítá jen jízdy na kole a že „Trenažér" zahrnuje i virtuální jízdy (Zwift).
5. Členové **bez vlastního propojení Stravy** (11 z 13) nemají u starých klubových dat rozlišení sportu. U nich se v režimu „Vše" použijí dosavadní klubová čísla a řádek dostane malou poznámku, že jde o data bez rozlišení sportu; u voleb Trenažér/Venku se jako dosud skryjí.

## Technické detaily

- `src/pages/Statistics.tsx`: volat `get_member_statistics_filtered('all')` i pro výchozí zobrazení a u propojených členů (`is_connected`) přepsat km/převýšení/jízdy hodnotami z RPC; nepropojení zůstanou na `strava_ytd_*`. Přepočítat pořadí, tempo a procenta z těchto hodnot. Upravit poznámku pod přepínačem.
- Žádná migrace není potřeba — `get_member_statistics_filtered` už v režimu `all` filtruje na `sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','VirtualRide')` a vylučuje duplicity.
- `profiles.strava_ytd_*` a `recalc_member_ytd()` zůstávají beze změny, takže nástěnka, klubové souhrny a profil člena počítají dál všechny sporty.
