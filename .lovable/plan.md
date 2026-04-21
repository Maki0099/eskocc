

## Lepší UX pro `/events` a „Nadcházející vyjížďky"

### Diagnóza současného stavu
- **3 taby vedle sebe** (Nadcházející / Historie / Nedávné jízdy) — uživatel musí klikat, aby viděl, „co se děje".
- **Karty nadcházejících jsou husté** — title, datum, místo, počet účastníků, distance/elevation badges, „Jdu" badge, toggle, externí odkaz — vše v jednom řádku, na mobilu se to láme.
- **Strava události vypadají skoro stejně** jako lokální, jen s oranžovým rámečkem — uživatel snadno přehlédne, že je nemůže potvrdit přes „Jdu".
- **Chybí časová orientace** — žádné „Dnes / Tento víkend / Příští týden" rozdělení. Když je 12 nadcházejících vyjížděk, je to monotónní seznam.
- **Žádný hero/next-up** — nejbližší vyjížďka by měla být vizuálně dominantní, teď splývá s ostatními.
- **Nedávné jízdy** jsou OK (po posledních úpravách), ale žijou v izolovaném tabu — uživatel je vidí jen když si vzpomene kliknout.

---

### Návrh nového UX

#### 1. „Next Up" hero karta nahoře
Nad taby dát **velkou kartu nejbližší vyjížďky** (pokud existuje, do 7 dní):
- Větší title, countdown („Za 2 dny · sobota 9:00"), místo, distance + elevation jako prominentní metriky.
- Avatary prvních 5 účastníků + „+8 dalších".
- Velké CTA tlačítko **„Jdu / Nejdu"** (ne malý toggle).
- Pokud má GPX → mini mapový náhled vpravo.
- Pokud je to Strava event → oranžový akcent + „Otevřít na Stravě".

Tím dostane uživatel **okamžitou odpověď** na „kam jdeme nejbližší víkend".

#### 2. Restrukturovat taby na 2 (místo 3)
- **„Vyjížďky"** (default) = Nadcházející + sekce „Nedávné jízdy klubu" pod tím (collapsed po 6 položkách s „Zobrazit více").
- **„Historie"** = beze změny.

Důvod: „Nadcházející" a „Nedávné jízdy" patří k sobě — obě odpovídají na „co se v klubu děje teď". Oddělené taby vytváří třecí bod.

#### 3. Časové grupování nadcházejících
Místo plochého seznamu rozdělit na sekce s nadpisy:
- **Tento týden** (do neděle)
- **Příští týden**
- **Později** (vše dál)

Každá sekce má malý nadpis + počet. Když je sekce prázdná, neukáže se.

#### 4. Vyčistit kartu vyjížďky
Současná karta má 7+ vizuálních elementů. Redesign:
```
┌─────────────────────────────────────────────┐
│ So 26.4. · 9:00      [● 12 jdou]   [Jdu ✓] │
│ Vyjížďka okolo Brna                          │
│ 📍 Brno-Lesná  ·  🚴 65 km  ·  ⛰ 850 m      │
└─────────────────────────────────────────────┘
```
- Datum a počet účastníků nahoře jako meta-řádek (menší, šedé).
- Title velký, samostatně.
- Lokace + metriky v jednom řádku s tečkovým oddělovačem (ne badges).
- CTA „Jdu/Nejdu" vpravo nahoře, vždy stejné místo.
- Strava události: stejný layout, jen oranžový proužek vlevo + ikona Stravy v meta-řádku.

#### 5. Filtry nadcházejících (lehké)
Pill řádek nad seznamem: **Vše · Silnice · MTB · Gravel · S GPX**. Filtruje podle `sport_type` (pokud máme) nebo podle distance heuristiky. Ve výchozím stavu „Vše" — žádný cognitive load pro běžného uživatele.

#### 6. „Nedávné jízdy" zkrácený přehled v hlavním tabu
Pod nadcházejícími:
- Header: **„Co klub jezdil tento týden"** + odkaz „Vše →" (otevře plnou sekci nebo modal s celými 14 dny).
- Zobrazit jen **dnes + včera** (max 6 karet). Existující komponentu `RecentClubActivities` použít s prop `compact + maxDays={2}`.
- Zachovat link na plnou historii (přes „Vše →").

#### 7. Dashboard widget zarovnat
`UpcomingEventsWidget` na Dashboardu má smysl ponechat, ale:
- Použít stejný layout karty jako na `/events` (konzistence).
- Pokud existuje „Next Up" do 48h → vizuální zvýraznění (border accent).

---

### Co se NEmění
- DB schema, RLS, edge funkce, sync logika — vše čistě front-end refactor.
- Funkcionalita účasti (`EventParticipationToggle`) — jen jiný visual wrapper.
- Strava event detekce a odkazy — beze změny logiky.

### Soubory

**Nové:**
- `src/components/events/NextUpHero.tsx` — hero karta nejbližší vyjížďky
- `src/components/events/EventCard.tsx` — sjednocená karta (lokální + Strava varianta přes prop)
- `src/components/events/UpcomingEventsList.tsx` — grouping podle Tento týden / Příští týden / Později + filtry
- `src/lib/event-utils.ts` — helpery `groupEventsByPeriod()`, `getNextUpEvent()`

**Upravené:**
- `src/pages/Events.tsx` — 2 taby místo 3, hero nahoře, „Co klub jezdil" sekce pod nadcházejícími
- `src/components/events/RecentClubActivities.tsx` — přidat props `compact?: boolean`, `maxDays?: number`
- `src/components/dashboard/UpcomingEventsWidget.tsx` — použít sdílenou `<EventCard />` pro konzistenci

**Beze změny:**
- `EventParticipationToggle`, `StravaEventBadge`, `EditEventDialog`, `CreateEventDialog`, edge funkce, DB.

### Otevřené otázky (před implementací)
1. **Hero karta**: chceš ji vždy viditelnou (i když je nejbližší vyjížďka za 3 týdny), nebo jen pokud je do 7 dní?
2. **Strava události v hero**: pokud je nejbližší událost Strava (ne lokální), má být v hero, nebo skipnout na nejbližší lokální?
3. **„Nedávné jízdy" jako 3. tab vs. sekce v hlavním tabu**: souhlasíš se sloučením do 2 tabů, nebo radši ponechat 3 a jen vylepšit karty?

