
## Odstranění Strava widgetu z patičky

**Změna:** Odstranit nefunkční Strava embed iframe z patičky a ponechat pouze textové odkazy na sociální sítě.

**Konkrétní úpravy v `Footer.tsx`:**

1. **Vymazat iframe** (řádky 79-91) — celý blok s `<iframe>` pro Strava widget
2. **Upravit sekci "Social"** — ponechat pouze odkazy na Facebook a Strava jako text
3. **Odstranit nepoužívaný import** — `useTheme` z `next-themes` už nebude potřeba, protože se nepoužívá pro dark mode widgetu

**Výsledek:** Čistší patička bez rozbitého iframe, zachovány odkazy na sociální sítě.
