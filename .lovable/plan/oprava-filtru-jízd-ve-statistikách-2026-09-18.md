# Oprava filtru jízd ve statistikách

## Problém
Přepínač ve statistikách nabízí „Vše / Bez trenažéru / Jen venku". Volby „Bez trenažéru" a „Jen venku" se překrývají (obe vyloučí trenažér, liší se jen dojížděním) a chybí logická varianta „jen trenažér".

## Cíl
Přepínač bude mít tři vzájemně se vylučující volby:
- **Vše** — všechny jízdy (výchozí, stávající součty)
- **Trenažér** — pouze jízdy na trenažéru / virtuální
- **Venku** — pouze jízdy venku (bez trenažéru a virtuálních)

## Kroky

### 1. Databáze — úprava funkce filtru
- Funkce `get_member_statistics_filtered` dostane místo dvou boolean parametrů jeden textový parametr `_mode` s hodnotami `'all' | 'trainer' | 'outdoor'`.
- Logika:
  - `'trainer'` → jen záznamy s `is_trainer = true` (včetně virtuálních jízd typu Zwift, které se jako trenažér počítají)
  - `'outdoor'` → jen `is_trainer = false`
  - `'all'` → bez omezení
- Zůstane SECURITY DEFINER, EXECUTE jen pro `authenticated`, REVOKE od anon.
- Vrací stejné sloupce: user_id, km, elevation, rides.

### 2. Frontend — Statistics.tsx
- Typ `RideFilter` změnit na `"all" | "trainer" | "outdoor"`.
- Volby přepínače: `Vše / Trenažér / Venku`.
- Volání RPC předá `_mode: rideFilter`; při `"all"` se filtr nevolá a použijí se výchozí součty (jako dnes).
- U filtrovaných hodnot zobrazit i počet jízd (rides), aby bylo vidět, kolik jízd filtr zahrnuje.

### 3. Ověření
- Build + kontrola v náhledu: přepnutí filtru mění hodnoty u všech členů, „Vše" odpovídá původním číslům, součet „Trenažér" + „Venku" = „Vše".

## Technické poznámky
- Dotčené soubory: nová migrace (úprava `get_member_statistics_filtered`), `src/pages/Statistics.tsx`, případně regenerované typy.
- Filtr se dál počítá pouze z osobních jízd propojených členů (`member_activities`), duplicity vyřazené.
