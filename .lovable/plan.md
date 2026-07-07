Upravit zobrazení jména člena na stránce Statistiky tak, aby se místo přezdívky ze Stravy zobrazovalo celé jméno z registrace.

Kroky:
1. V souboru `src/pages/Statistics.tsx` změnit řádek zobrazující jméno člena v žebříčku:
   - Z `{member.nickname || member.full_name || "Bez jména"}` na `{member.full_name || member.nickname || "Bez jména"}`.
2. Ponechat zálohu na přezdívku jen pro případ, že by celé jméno nebylo vyplněné.
3. Iniciály v avatar fallbacku už preferují `full_name`, takže tam není potřeba změna.
4. Ověřit build/preview.