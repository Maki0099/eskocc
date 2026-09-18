# Oprava výpočtu trenažéru

## Co je špatně

Máte pravdu. Data v databázi ukazují, že u Martina Habáně je letos:

- 629 km / 17 jízd typu „virtuální jízda" (Zwift a podobné) — ty se dnes počítají jako **venku**, protože Strava u nich nenastavuje příznak trenažéru.
- Naopak 81 km / 8 **běhů na pásu** se dnes počítá do kolonky „Trenažér", i když s kolem nesouvisí.

Výsledek: místo skutečných zhruba 630 km uvnitř karta ukazuje 81 km, a ta čísla navíc pocházejí z běhu.

## Co upravím

1. Za „uvnitř" se bude považovat jízda označená Stravou jako trenažér **nebo** jakákoli virtuální jízda (Zwift, virtuální běh).
2. Karta „Venku vs trenažér" bude počítat jen cyklistické aktivity, aby se do ní nemíchal běh, lyže a chůze. Popisek karty to uvede.
3. Stejná pravidla použiji i pro popis v přehledu sezóny, aby čísla nikde nesedala rozdílně.

Po úpravě bude u Martina poměr venku/uvnitř odpovídat realitě (zhruba 3 180 km venku vs 630 km na trenažéru).

## Technické detaily

- Nová verze RPC `get_member_trainer_ratio(_user_id, _year)`: podmínka `is_trainer OR sport_type IN ('VirtualRide','VirtualRun')` určuje kategorii „Trenažér"; filtr na cyklistické `sport_type` (`Ride`, `MountainBikeRide`, `GravelRide`, `EBikeRide`, `VirtualRide`); i nadále `excluded_as_duplicate = false`, SECURITY DEFINER, EXECUTE jen pro `authenticated`.
- `src/components/member/TrainerRatio.tsx`: doplněný podtitulek „jen jízdy na kole" a popisek „Uvnitř (trenažér / Zwift)". Žádná změna datového toku.
- Synchronizace ani sloupce v `member_activities` se nemění — `is_trainer` zůstává tak, jak ho posílá Strava.
