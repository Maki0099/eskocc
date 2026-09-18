# Sjednocení výpočtu Trenažér / Venku ve statistikách

## Co je teď špatně (ověřeno v datech)

Přepínač ve statistikách (Vše / Trenažér / Venku) se rozhoduje **jen podle příznaku „trenažér"** ze Stravy, zatímco karta v profilu člena už počítá správně. Proto si obě čísla odporují.

Konkrétně za rok 2026:

- Martin Habáň: 17 virtuálních jízd (Zwift) = 629 km spadá ve statistikách do **Venku**; naopak 8 běhů na pásu (81 km) se počítá jako **Trenažér**.
- Tomáš Machalínek: 10 virtuálních jízd (131 km) jako Venku, 1 běh/jízda na pásu jako Trenažér.

Navíc přepínač sčítá **všechny sporty** — běh, chůzi, turistiku, skialp — takže „Venku" a „Vše" neodpovídají cyklistickým číslům z profilu.

## Co udělám

1. Přepínač bude používat stejné pravidlo jako karta v profilu:
   - **Trenažér** = jízdy s příznakem trenažéru **nebo** virtuální jízdy (Zwift).
   - **Venku** = ostatní jízdy.
2. Do všech tří voleb budou vstupovat **jen jízdy na kole** (silnice, MTB, gravel, e-bike, virtuální). Běh, chůze, turistika a skialp se do pořadí členů počítat nebudou.
3. Pod přepínačem bude krátká poznámka, že se počítají jen jízdy na kole a že „Trenažér" zahrnuje i Zwift — aby bylo jasné, proč se čísla liší od celkového součtu ve Stravě.

Po úpravě bude platit: Trenažér + Venku = Vše, a čísla ve statistikách budou souhlasit s kartou „venku vs trenažér" v profilu člena.

## Technické detaily

- Nová migrace přepíše `get_member_statistics_filtered(_mode text)`:
  - filtr sportů `sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide','VirtualRide')`,
  - `trainer` = `is_trainer = true OR sport_type IN ('VirtualRide','VirtualRun')`,
  - `outdoor` = negace téhož,
  - `all` = oba dohromady (stejná sada sportů),
  - zachovat `excluded_as_duplicate = false`, aktuální rok, `SECURITY DEFINER`, `REVOKE` od `anon`, `GRANT EXECUTE` pro `authenticated`.
- `src/pages/Statistics.tsx`: pouze doplnit vysvětlující poznámku k přepínači; logika volání RPC zůstává.

## Otevřená otázka (neblokuje)

Celkové roční součty (`profiles.strava_ytd_*`, tempo k cíli) dnes obsahují i nekolařské sporty. Pokud chceš, můžu je v dalším kroku také omezit jen na kolo — řekni a připravím to zvlášť.
