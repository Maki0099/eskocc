# Odlišení virtuálních jízd na mapě klubu

Virtuální jízdy (Zwift, ROUVY) posílají skutečné souřadnice herní trasy — proto se na mapě klubu objevují ve Skotsku, na Mallorce nebo na Novém Zélandu. Zůstanou na mapě, ale budou jasně odlišené.

## Co uvidíš

- Virtuální jízdy budou mít **jinou barvu** značky i stopy než skutečné venkovní jízdy (venku hnědá, virtuální modrá s přerušovanou stopou).
- V bublině po kliknutí na značku přibude popisek **„Virtuální jízda (Zwift / ROUVY)"**.
- Pod mapou bude **legenda** s oběma barvami a krátké vysvětlení, proč se virtuální jízdy objevují po celém světě.
- Nad mapou přibude přepínač **Vše / Venku / Virtuální**, aby šlo virtuální jízdy jedním klikem skrýt.

## Technické kroky

1. Migrace: `get_club_activity_polylines(_days)` doplní sloupec `is_virtual` = `is_trainer = true OR sport_type IN ('VirtualRide','VirtualRun')`. Zbytek dotazu i práva (SECURITY DEFINER, EXECUTE jen `authenticated`) beze změny.
2. `src/pages/ClubMap.tsx`:
   - rozšířit `ActivityLine` o `is_virtual: boolean`;
   - GeoJSON features dostanou `properties.isVirtual`; vrstva `route-lines-layer` bude barvu i `line-dasharray` řídit výrazem podle této vlastnosti (nebo druhá vrstva pro virtuální trasy s `filter`);
   - barva markeru podle `is_virtual` (hnědá `#7A6855` vs modrá `#3B82F6`), v popupu řádek „Virtuální jízda (Zwift / ROUVY)";
   - stav `rideKind: "all" | "outdoor" | "virtual"` filtrující pole `activities` před vykreslením + přepínač ve stejném stylu jako přepínač období;
   - legenda a vysvětlující věta pod mapou, text u počtu jízd doplnit o počet virtuálních.
3. Ověřit v náhledu (desktop i mobilní šířka), že mapa vykresluje obě barvy a přepínač funguje.
