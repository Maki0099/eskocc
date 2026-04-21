

## Mobilní optimalizace karet vyjížděk + výrazné CTA „Jdu/Nejdu"

### Diagnóza
Na mobilu (≤640px) se v `EventCard` skládá do jednoho řádku datum, počet účastníků, badge Strava/Pouze ženy, admin ikony **a** participation toggle. Toggle se zmenší (skryje text „Přihlásit"), splývá s ostatními chipy a přestává být primární akcí. Title je až pod meta řádkem, takže CTA je vizuálně schované.

### Cíl
Na mobilu udělat z **„Jdu/Nejdu"** dominantní akci — full-width tlačítko pod obsahem karty, vždy viditelné, s jasným barevným stavem. Na desktopu zachovat kompaktní řádek vpravo nahoře.

---

### Návrh

#### 1. Restrukturace `EventCard` — mobile-first stack

**Mobil (`<sm`):**
```
┌──────────────────────────────────┐
│ ČT 24. 4. · 18:00  · 5 jede      │  ← meta (bez CTA)
│ [Strava] [Pouze ženy]            │
│                                  │
│ Vyjížďka okolo Brna              │  ← title (větší, výraznější)
│                                  │
│ 📍 Brno  🛣 45 km  ⛰ 600 m       │  ← meta line
│                                  │
│ ┌──────────────────────────────┐ │
│ │   ✓  Jdu na vyjížďku         │ │  ← full-width CTA
│ └──────────────────────────────┘ │
│ [✏ admin] [🗑 admin]   (vpravo)  │  ← admin akce zvlášť, malé
└──────────────────────────────────┘
```

**Desktop (`≥sm`):** zachovat současný layout — CTA vpravo nahoře vedle meta řádku.

#### 2. Vylepšený participation button

`EventParticipationToggle` dostane prop `fullWidth?: boolean` a `size?: "sm" | "default" | "lg"`:

- **Mobil**: `size="lg"`, `fullWidth`, vždy viditelný text („Jdu na vyjížďku" / „Už nejdu"), výrazná barva:
  - Nepřihlášen: `variant="default"` (primární, plná barva) + ikona `UserPlus`
  - Přihlášen: `variant="secondary"` se zeleným ringem + ikona `Check` + text „Jdeš ✓ — odhlásit"
- **Desktop**: současné chování (sm, ikona + text)

Odstranit oddělený `Badge` „Jdeš ✓" z karty — stav je vyjádřený samotným tlačítkem.

#### 3. Strava karty na mobilu

Pro Strava události (kde nelze toggle) udělat **full-width „Otevřít na Stravě"** tlačítko ve stejné pozici, oranžové (`bg-[#FC4C02]`). Konzistentní vizuální rytmus — uživatel vždy ví, kde je primární akce.

#### 4. Admin akce

Na mobilu přesunout `Pencil` + `Trash2` ikony do pravého spodního rohu karty (malý řádek pod CTA, justify-end). Na desktopu zůstávají vpravo nahoře. Nebudou konkurovat hlavnímu CTA.

#### 5. NextUpHero (hero karta)

Stejný princip: na mobilu CTA full-width pod metadaty. „Detail vyjížďky" pod hlavním CTA jako sekundární odkaz (text-only `link` variant nebo `outline` full-width).

#### 6. Touch targety

Hlavní CTA min. `h-12` (48px) — Apple/Material guideline. Admin ikony min. `h-9 w-9` s rozumným paddingem mezi nimi (gap-2).

#### 7. Vizuální stavy

Stav „přihlášen" musí být okamžitě čitelný:
- Tlačítko `secondary` + thin levý border `border-l-4 border-l-green-500` na celé kartě (subtilně)
- Nebo: jen výrazné tlačítko se zeleným ✓ a textem „Jdeš — odhlásit"

Volím variantu s tlačítkem (méně vizuálního šumu na kartě, akce zůstává dominantní).

---

### Soubory

**Upravené:**
- `src/components/events/EventCard.tsx` — restrukturace na mobile-first: meta nahoře (bez CTA/admin), title, meta line, full-width CTA blok dole, admin akce v patičce. Použití `useIsMobile` nebo čisté Tailwind responsive třídy (`sm:` breakpoint).
- `src/components/events/EventParticipationToggle.tsx` — přidat props `fullWidth`, `size`, `showFullText`. Vždy zobrazit text na mobilu. Lepší vizuální stavy (ikona + text podle stavu).
- `src/components/events/NextUpHero.tsx` — full-width CTA na mobilu, sekundární akce pod ním.

**Beze změny:**
- `UpcomingEventsList`, `DayHeader`, `EventsCalendarView`, `event-utils.ts`, edge funkce, DB.

### Otevřené otázky

1. **Zachovat tlačítko vpravo nahoře i na desktopu**, nebo přesunout full-width CTA i na desktop pro konzistenci napříč zařízeními?
2. **Vizuální označení „jsem přihlášen"**: stačí změna stavu tlačítka (varianta A), nebo přidat i jemný levý border na kartě (varianta B)?
3. **Admin akce na mobilu** — pod CTA v patičce karty (jak navrhuji), nebo radši v meta řádku nahoře (jako dnes), jen menší?

