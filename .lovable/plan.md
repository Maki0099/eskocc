

## Kalendářní zobrazení nadcházejících vyjížděk

### Diagnóza
Současné grupování po týdnech ("Tento týden / Příští týden / Později") je hrubé — uživatel nevidí na první pohled, **který konkrétní den** se jede. Když je v týdnu 4 vyjížďky, splývají dohromady.

### Cíl
Řazení **po dnech** s jasným denním nadpisem (datum + den v týdnu), prázdné dny se přeskakují. Volitelně přepínač mezi seznamem a měsíčním kalendářem.

---

### Návrh

#### 1. Denní grupování (default view)
Nahradit `groupEventsByPeriod` novým `groupEventsByDay`. Každá skupina = jeden konkrétní den s vyjížďkou. Layout:

```
┌─ ČT 24. dubna ────────────── zítra ─┐
│  [karta vyjížďky]                    │
└──────────────────────────────────────┘

┌─ SO 26. dubna ──────────── za 3 dny ─┐
│  [karta vyjížďky]                    │
│  [karta vyjížďky]   ← víc jízd v den │
└──────────────────────────────────────┘

┌─ NE 4. května ──────────────────────┐
│  [karta vyjížďky]                    │
└──────────────────────────────────────┘
```

Denní header obsahuje:
- **Velký den + datum** vlevo (např. `ČT 24. dubna`), zvýrazněně
- **Relativní popisek** vpravo (`dnes`, `zítra`, `za 3 dny`, `příští týden`, jinak nic)
- Levá barevná lišta / tečka pro vizuální rytmus
- Sticky chování při scrollu (volitelné — header se přilepí nahoru, dokud nepřijde další den)

Mezi dny větší vertikální mezera (`space-y-8`), uvnitř dne menší (`space-y-2`).

#### 2. Měsíční oddělovač
Když přechod mezi dny překročí měsíc, vsadit tenký label:
```
─── KVĚTEN 2026 ───
```
Pomáhá orientaci u dlouhých seznamů.

#### 3. Přepínač View: Seznam ↔ Kalendář
Vpravo nahoře vedle filtrů: ikony **☰ Seznam** / **▦ Kalendář**.

**Kalendářní view** = klasický měsíční grid (Po–Ne), den s vyjížďkou má:
- Tečku/badge s počtem jízd (1, 2, 3+)
- Klik na den → scroll/expand seznamu na ten den (nebo popover s mini-kartami)
- Today highlight, navigace ‹ Duben | Květen ›

Použít existující `Calendar` (react-day-picker) z `src/components/ui/calendar.tsx` s custom `modifiers` pro dny s eventy.

Default view = **Seznam** (mobile-first). Kalendář je opt-in pro desktop power-usery. Volba se pamatuje v `localStorage`.

#### 4. Filtry zůstanou
Pill řádek (Vše / Silnice / MTB / Gravel / S GPX) pracuje přes oba view. V kalendáři se promítne do tečkování dnů.

#### 5. Hero "Next Up" zůstává nahoře
Beze změny — pořád ukazuje nejbližší vyjížďku do 7 dní jako prominentní kartu nad denním seznamem.

#### 6. Mobil
- Denní header je menší ale stále jasný (`text-sm font-semibold uppercase` pro den, datum jako sekundární)
- Kalendářní grid na mobilu kompaktní (full-width buňky, jen tečky bez čísel)
- Sticky day header funguje i na mobilu

---

### Soubory

**Nové:**
- `src/components/events/EventsCalendarView.tsx` — měsíční kalendář s tečkováním dnů a popoverem
- `src/components/events/DayHeader.tsx` — sticky denní nadpis s relativním popiskem

**Upravené:**
- `src/lib/event-utils.ts` — nahradit/doplnit `groupEventsByDay()` (klíč = `yyyy-MM-dd`), helper `getRelativeDayLabel(date)` ("dnes" / "zítra" / "za N dní" / null)
- `src/components/events/UpcomingEventsList.tsx` — denní grupování + view toggle (seznam/kalendář), `localStorage` perzistence preference
- `src/pages/Events.tsx` — žádné změny v topologii, jen předá data do nového listu

**Beze změny:**
- `EventCard`, `NextUpHero`, `RecentClubActivities`, edge funkce, DB.

### Otevřené otázky

1. **Sticky day header** při scrollu — chceš (vždy víš ve kterém dni jsi), nebo necháme statické?
2. **Default view** — souhlasíš se Seznamem jako výchozím a Kalendářem jako opt-in přepínačem? Nebo radši Kalendář defaultně na desktopu?
3. **Klik na den v kalendáři** — preferuješ (a) scroll na ten den v seznamu pod kalendářem, nebo (b) popover/dialog se seznamem jízd toho dne přímo nad kalendářem?

