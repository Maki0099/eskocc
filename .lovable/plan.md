

## Návrhy dalších UX/UI vylepšení

Na základě analýzy aktuálního stavu (zejména Events flow, Dashboard, karty) navrhuji následující vylepšení seřazená podle dopadu vs. úsilí. Vyber, co chceš implementovat — nemusíme dělat vše najednou.

---

### 🥇 Tier 1 — Vysoký dopad, nízké úsilí

#### 1. Sticky day header v seznamu vyjížděk
Při scrollování dlouhým seznamem ztrácíš kontext, ve kterém dni jsi. `DayHeader` udělat `sticky top-16` (pod navbarem) s `backdrop-blur` pozadím. Plynulý orientační prvek bez nutnosti scrollovat zpět.

#### 2. Empty states s akcí
Aktuálně: „Žádné nadcházející vyjížďky" — suchá věta. Navrhuji ilustraci/ikonu + text + **CTA tlačítko** podle role:
- Admin/active_member: „Naplánuj první vyjížďku" → otevře `CreateEventDialog`
- Member: „Zatím nic — mrkni na oblíbené trasy" → link na Routes
- Při aktivním filtru: „V kategorii X nic není" + tlačítko „Zrušit filtr"

#### 3. Kompaktní filtry → segmented control
5 pill tlačítek (`Vše / Silnice / MTB / Gravel / S GPX`) zabírá celý řádek. Nahradit jedním `Tabs`/`ToggleGroup` ve stylu iOS segmented controlu — kompaktnější, přirozenější přepínání.

#### 4. Skeleton loadery místo spinnerů
Pro Events list, Dashboard widgety a Gallery použít `Skeleton` komponenty kopírující strukturu finálního obsahu. Vnímaná rychlost ↑, žádný „flash" prázdné stránky.

#### 5. Toast → optimistic UI pro participation
Dnes: klik → loading spinner → DB → toast → refresh. Navrhuji **optimistický update**: tlačítko se přepne okamžitě, na pozadí volá DB, při chybě rollback + toast. Pocit instantní odezvy.

---

### 🥈 Tier 2 — Střední dopad

#### 6. Quick filters „Tento víkend / Příští týden"
Nad seznamem přidat rychlé time-based filtry. Většina uživatelů hledá „co se jede teď v sobotu" — ne procházení celého kalendáře.

#### 7. Avatar stack účastníků na kartě
Místo „5 jede" zobrazit malý stack 3 avatarů + „+2". Sociální důkaz, vidíš s kým pojedeš. Klik → modal/popover se seznamem.

#### 8. Search bar pro vyjížďky a trasy
Když je událostí 20+, jednoduchý fulltext search nad title + location. `cmd+K` paleta později.

#### 9. Pull-to-refresh na mobilu
Na PWA/mobilu nativní gesto pro refresh dat na Events, Dashboard, Gallery, Notifications. Standard mobile pattern, který chybí.

#### 10. Inline edit profilu
Account page: místo „Editovat" módu udělat inline editovatelná pole s jemnou hover indikací (ikona tužky). Méně klikání.

#### 11. Compact mode pro hustý kalendář
V `EventsCalendarView` při >2 jízdách v týdnu přepnout na denser layout. Aktuální spacing je vzdušný, ale pro power-usery zbytečně velký.

#### 12. Breadcrumbs na detailních stránkách
`/events/:id`, `/routes/:id`, `/member/:id` — přidat breadcrumb navigaci. Lepší orientace v hierarchii.

---

### 🥉 Tier 3 — Polish & delight

#### 13. Mikrointerakce a haptika
- Confetti/checkmark animace při přihlášení na vyjížďku
- Haptic feedback (`navigator.vibrate`) na mobilu při toggle akcích
- Subtle bounce na nové notifikace v `NotificationBell`

#### 14. Gradient meshes / glow accenty
Hero sekce a Next-Up Hero karta: jemné animované gradient meshe v pozadí (Apple-style). Přidá premium pocit bez vizuálního šumu.

#### 15. Fokus a accessibility audit
- Visible focus rings na všech interaktivních prvcích
- Skip-to-content link
- ARIA labels na ikonových tlačítkách
- Prefers-reduced-motion respekt pro animace

#### 16. Komentáře/diskuze pod vyjížďkou
Detail vyjížďky: jednoduché vlákno komentářů (sraz na jiném místě, otázky na tempo, atd.). Real-time přes Supabase channels. **Větší feature** — vyžaduje DB tabulku.

#### 17. Kalendář export (.ics)
Tlačítko „Přidat do kalendáře" na detailu vyjížďky — generuje `.ics` soubor pro Google/Apple Calendar. Lehká retence.

#### 18. Dashboard personalizace
Přesouvatelné widgety (drag & drop), uživatel si poskládá pořadí. Uloženo v profile preferencích. **Větší práce** — má smysl až bude víc widgetů.

#### 19. Mapa všech aktivních vyjížděk
Nová sekce/tab: mapa Česka s pinami všech nadcházejících vyjížděk. Klik na pin → karta. Vizuálně atraktivní pro orientaci podle regionu.

#### 20. Theme transition animation
Při přepnutí dark/light módu plynulý radial-wipe efekt z místa kliknutí (View Transitions API). Drobnost, ale pamatovatelné.

---

### Doporučený first batch

Pokud chceš začít, navrhuji **balíček „Quick Wins"** (1 implementační kolo):

- ✅ #1 Sticky day headers
- ✅ #2 Empty states s CTA
- ✅ #4 Skeleton loadery (Events list)
- ✅ #5 Optimistic participation toggle
- ✅ #7 Avatar stack účastníků

Tyto vylepšení znatelně pozvednou pocit z používání bez nutnosti DB migrací (kromě #7, kde stačí JOIN na profiles).

---

### Otázky

1. Který **tier / konkrétní položky** chceš implementovat? (Můžeš vybrat napříč.)
2. Mám rovnou jít s doporučeným „Quick Wins" balíčkem (#1, #2, #4, #5, #7), nebo si vybereš vlastní kombinaci?
3. U avatar stacku (#7) — chceš zobrazovat **iniciály**, nebo **profilové fotky** (pokud nejsou, fallback na iniciály)?

