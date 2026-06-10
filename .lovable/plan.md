Stránka `/pruvodce-beskydy` má v hero sekci nadměrný horní padding (`pt-32` na mobilu, `md:pt-44` na desktopu), který vytváří velkou prázdnou mezeru pod fixed headerem (výška 64px). Oprava: snížit padding na `pt-20 md:pt-24`, aby mezera odpovídala výšce hlavičky s malým offsetem.

Soubor: `src/pages/PruvodceBeskydy.tsx`
Změna: řádek 141 – upravit třídy `pt-32 pb-16 md:pt-44 md:pb-24` na `pt-20 pb-16 md:pt-24 md:pb-24`.