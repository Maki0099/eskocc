# Lepší detekce duplicitních jízd (dvě zařízení Garmin)

## Cíl
Odhalit jízdy nahráno dvakrát z dvou zařízení (např. hodinky + cyklopočítač Garmin). Takové jízdy mají téměř stejnou vzdálenost a čas, ale převýšení se může lišit, protože každé zařízení měří výšku jinak.

## Zjištění z dat
- Sloupec `activity_date` v `club_activities` obsahuje čas synchronizace, ne skutečné datum jízdy (Strava club feed skutečné datum neposkytuje). Proto nelze spolehlivě párovat podle „stejného dne" — např. jeden jezdec má 43 jízd se stejným datem synchronizace.
- Spolehlivý signál dvou zařízení: stejný jezdec + skoro stejná vzdálenost + skoro stejný čas jízdy.
- Současná detekce (rozdíl vzdálenosti ≤ 50 m a převýšení ≤ 10 m) tyto případy nechytá — převýšení se mezi zařízeními běžně liší o desítky metrů.

## Změny

### 1. Databáze — úprava funkce `get_duplicate_activity_candidates()`
Nová pravidla pro podezřelou dvojici (stejný jezdec, obě jízdy ≥ 1 km, stejný sport):
- rozdíl vzdálenosti ≤ 300 m **nebo** ≤ 2 % delší jízdy,
- rozdíl času jízdy ≤ 5 minut **nebo** ≤ 5 % delšího času,
- převýšení se už jako podmínka nepoužije (jen se zobrazí jako informace),
- bonusové označení „velmi pravděpodobná duplicita", když je shodná vzdálenost i čas téměř přesně (≤ 50 m a ≤ 60 s).

Funkce vrátí navíc příznak `likely_duplicate`, aby admin poznal, kde si být jistý.

### 2. Administrace — záložka „Duplicity"
- U každé dvojice se zobrazí rozdíl vzdálenosti, času i převýšení (převýšení nově jen informativně).
- Dvojice s příznakem „velmi pravděpodobná" se zvýrazní a seřadí nahoru.
- Popisek upraven: detekce podle vzdálenosti a času jízdy (typické pro nahrání ze dvou zařízení).
- Ovládání zůstává stejné: „Označit jako duplicitu" / „Přece jen počítat", statistiky se přepočítají automaticky.

### 3. Ověření
- Dotazem v databázi ověřit, že nová pravidla najdou známé případy (např. Robert V. 81,1 km dvakrát, Martin H. 41,9 km dvakrát).
- Zkontrolovat, že se neoznačí falešné dvojice (dva různé tréninky stejné délky v různé dny — proto zůstává podmínka shodného času).

## Technické detaily
- Migrace: `CREATE OR REPLACE FUNCTION public.get_duplicate_activity_candidates()` — nové podmínky spárování, nový výstupní sloupec `likely_duplicate boolean`; zůstává admin-only přes `has_role(auth.uid(), 'admin')`.
- Frontend: `src/components/admin/DuplicateActivitiesAdmin.tsx` — nové pole v typu, badge „Pravděpodobná duplicita", řazení, upravený popisek.
- Žádná změna v ukládání ani v přepočtu statistik (`set_activity_duplicate`, `recalc_club_ytd` zůstávají).
