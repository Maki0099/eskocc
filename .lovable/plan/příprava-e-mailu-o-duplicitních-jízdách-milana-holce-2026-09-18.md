# Příprava e-mailu o duplicitních jízdách Milana Holce

## Cíl
Připravit text e-mailu, který shrnuje pravděpodobné duplicitní jízdy Milana Holce nalezené v datech klubu. E-mail bude připraven ke zkopírování a přeposlání příjemci.

## Zdroj dat
- Výsledky z předchozí analýzy duplicitních aktivit v tabulce `club_activities`.
- Filtrováno podle jezdce "milan H." a dvojic synchronizovaných ve stejný den.
- Výběr zahrnuje jen záznamy, které dosud nejsou označeny jako duplicitní (`excluded_as_duplicate = false`).

## Výstup
- Text e-mailu v češtině, stručný a věcný.
- Uvedeno datum synchronizace, vzdálenost, čas jízdy, převýšení a poznámku o možném zdvojení ze dvou zařízení.
- Žádné kódové ani databázové změny.
