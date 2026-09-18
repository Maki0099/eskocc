# Přepínač Vše / Trenažér / Venku a dva zdroje dat

## V čem je problém (ověřeno v datech)

Statistiky teď stojí na dvou zdrojích:

- **Vlastní propojení Stravy** — mají jen 2 členové (Tomáš 103 jízd, Martin 79). U nich známe u každé jízdy typ sportu i to, zda šlo o trenažér nebo Zwift.
- **Stará klubová data** (do 1. 9. 2026) — zbylých 11 členů. Tam je jen vzdálenost, čas a převýšení; **rozlišení trenažér / venku v nich vůbec není**.

Přepínač proto u nepropojených členů nic nefiltruje a ukazuje jim dál celkový součet, takže pořadí míchá jablka s hruškami.

## Jak to napravím

1. Při volbě **Trenažér** nebo **Venku** se v pořadí zobrazí **jen členové s vlastním propojením Stravy**. Ostatní se skryjí, protože pro ně taková data neexistují.
2. Pod seznamem se objeví vysvětlující řádek, například: „Zobrazeni jen členové s vlastním propojením Stravy (2 z 13). U ostatních nelze trenažér a venkovní jízdy rozlišit — propojením Stravy se to změní."
3. U volby **Vše** zůstane vše jako dnes — všichni členové i se starými klubovými daty.
4. Pořadí a čísla se po skrytí přepočítají, aby čísla míst (1., 2., …) odpovídala zobrazenému seznamu.

## Technické detaily

- Změna je pouze v `src/pages/Statistics.tsx`, žádná migrace:
  - do `sortedMembers` přidat filtr `rideFilter === "all" || member.is_connected`,
  - pořadí (`index`) počítat z již odfiltrovaného pole,
  - poznámku pod seznamem vykreslit jen když `rideFilter !== "all"`, s počty `connected/total`,
  - stávající poznámku „Počítají se jen jízdy na kole · Trenažér zahrnuje i Zwift" ponechat.
- `get_member_statistics_filtered` zůstává beze změny.
