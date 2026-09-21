# Proč Trenažér + Venku nedává Vše

## V čem je rozdíl (ověřeno v datech za 2026)

Volba **Vše** ukazuje celkový roční součet ze Stravy — tedy **všechny sporty** (běh, chůze, turistika, skialp).
Volby **Trenažér** a **Venku** počítají záměrně **jen jízdy na kole**.

Rozdíl jsou tedy nekolařské aktivity:

| Člen | Vše | Kolo celkem | Trenažér | Venku | Rozdíl (nekolo) |
|---|---|---|---|---|---|
| Martin Habáň | 4 113 | 3 954 | 629 | 3 325 | 159 |
| Tomáš Machalínek | 2 795 | 2 586 | 145 | 2 441 | 209 |
| Zbyněk Kúřil | 4 728 | 4 318 | 0 | 4 318 | 410 |
| Kamil Čejka | 4 698 | 4 685 | 0 | 4 685 | 13 |
| Adam Kuril | 3 277 | 3 264 | 0 | 3 264 | 13 |

Takže součet sedí vždy takto: **Trenažér + Venku = jen kolo**, ne „Vše".

## Jak to napravit

Navrhuji volbu **Vše** přejmenovat na **Vše (vč. běhu)** a doplnit u ní poznámku, že zahrnuje i nekolařské aktivity, zatímco Trenažér a Venku počítají jen kolo. Tím zůstanou pořadí i cíle sezóny beze změny a jen se vysvětlí rozdíl.

Alternativa (větší zásah): omezit i volbu **Vše** jen na kolo — pak by součet seděl přesně, ale změnila by se čísla v pořadí členů, tempo k ročnímu cíli i porovnání se staršími klubovými daty, kde rozlišení sportu chybí.

## Technické detaily

- Varianta A (doporučená): jen `src/pages/Statistics.tsx` — popisek přepínače a rozšířená poznámka pod ním. Žádná migrace.
- Varianta B: nová verze RPC `get_member_statistics_filtered` s režimem `all` omezeným na cyklistické `sport_type`, plus použití tohoto režimu i pro výchozí zobrazení místo `profiles.strava_ytd_*`. Nepropojení členové by v režimu „Vše" museli zůstat na klubových datech, takže by se čísla mezi členy míchala.
