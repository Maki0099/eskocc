

## Sjednocení tlačítka přihlášení na detailu vyjížďky

### Diagnóza

Na detailu vyjížďky (`EventDetail.tsx`, řádky 606–613) je participation jako dvě plain `<Button>` varianty:

```tsx
{isParticipating ? (
  <Button variant="outline" onClick={handleLeave}>Odhlásit se</Button>
) : (
  <Button onClick={handleJoin}>Přihlásit se</Button>
)}
```

To se vizuálně **liší** od seznamu vyjížděk, kde používáme `EventParticipationToggle`:
- Zelený ring + tinted background pro stav „jdu"
- Checkmark ikona + text „Jdeš ✓ — odhlásit"
- Optimistický UI update (instant feedback)
- Haptická odezva na mobilu
- Vlastní rollback při chybě + jednotné toasty

### Návrh

Nahradit dvojici tlačítek na detailu **stejnou komponentou `EventParticipationToggle`**, která se používá v seznamu — dostaneme tím konzistentní vizuál, chování i terminologii napříč aplikací.

**Konkrétně v `EventDetail.tsx`:**

```tsx
{user && !isPastEvent(event.event_date) && (
  <EventParticipationToggle
    eventId={id!}
    userId={user.id}
    isParticipating={isParticipating}
    onToggle={fetchEvent}
    size="default"
    showFullText
  />
)}
```

- `size="default"` (h-11) — odpovídá ostatním tlačítkům v action řádku (Stáhnout GPX, Zobrazit trasu…), aby výškově ladily.
- `showFullText` — vždy zobrazit plný text („Jdu na vyjížďku" / „Jdeš ✓ — odhlásit"), žádné skrývání pod `sm:` breakpointem (na detailu je dost místa).
- `onToggle={fetchEvent}` — po změně refetch detailu (znovu se vykreslí seznam účastníků níže).

**Drobné úklidy:**
- Odstranit lokální handlery `handleJoin` a `handleLeave` z `EventDetail.tsx` (duplicitní logika, toggle si DB volání řeší interně).
- Přidat import `EventParticipationToggle` na začátek souboru.

### Vizuální dopad

```text
Před:                              Po:
┌──────────────┐                   ┌────────────────────────┐
│ Přihlásit se │  (plain primary)  │ + Jdu na vyjížďku      │  (primary, ikona)
└──────────────┘                   └────────────────────────┘

┌──────────────┐                   ┌────────────────────────┐
│ Odhlásit se  │  (outline)        │ ✓ Jdeš ✓ — odhlásit    │  (zelený ring/tint)
└──────────────┘                   └────────────────────────┘
```

Stejný look & feel jako na kartách v seznamu → uživatel okamžitě pozná stav i akci.

### Soubory

**Upravený:**
- `src/pages/EventDetail.tsx` — import `EventParticipationToggle`, nahrazení dvojice tlačítek na řádcích 606–613, odstranění nevyužitých handlerů `handleJoin` a `handleLeave`.

**Beze změny:**
- `EventParticipationToggle.tsx` — komponenta už podporuje všechny potřebné props (`size`, `showFullText`, `fullWidth`).
- DB, RLS, edge funkce, ostatní stránky.

