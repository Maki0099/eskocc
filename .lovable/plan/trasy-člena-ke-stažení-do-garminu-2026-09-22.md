# Trasy člena ke stažení do Garminu

Na profilu člena přibude sekce **Trasy**, kde ostatní členové uvidí jeho venkovní jízdy na kole i s mapou a budou si je moct stáhnout jako GPX a nahrát do Garmin zařízení.

## Co uvidí člen

- Nová karta **Trasy** na profilu člena (`/member/:id`), pod grafy.
- Seznam posledních venkovních jízd na kole (trenažér a virtuální jízdy se nezobrazují): název, datum, vzdálenost, převýšení, čas.
- U každé jízdy malý náhled trasy na mapě; kliknutím se otevře větší mapa.
- Tlačítko **Stáhnout GPX** u každé jízdy.
- Krátký návod „Jak dostat trasu do Garminu": stáhnout GPX → v Garmin Connect *Tréninky a plánování → Trasy → Importovat* → odeslat do zařízení.
- Stránkování / tlačítko „Načíst další" po 20 jízdách.
- Pokud člen nemá propojenou Stravu nebo žádná jízda nemá stopu, zobrazí se srozumitelná hláška.

Trasy vidí všichni přihlášení členové, bez možnosti vypnutí.

## Technická část

**Databáze** – nová funkce `get_member_routes(_user_id uuid, _limit int, _offset int)`, SECURITY DEFINER, STABLE, EXECUTE jen pro `authenticated` (REVOKE anon/public). Vrací z `member_activities`: `id, name, activity_date, distance_m, moving_time, elevation_gain, sport_type, map_polyline, start_lat, start_lng`.
Filtr: `excluded_as_duplicate = false`, `map_polyline` není prázdný, `sport_type IN ('Ride','MountainBikeRide','GravelRide','EBikeRide')`, `is_trainer = false`, řazení podle data sestupně.

**Frontend**
- `src/lib/polyline.ts` – sdílený dekodér polyline (dnes je privátně v `ClubMap.tsx`; `ClubMap` na něj přepneme) + funkce `coordsToGpx(coords, name, date)`, která vygeneruje GPX 1.1 s `<trk>/<trkseg>/<trkpt>` a stáhne ho přes Blob (`nazev-jizdy-2026-09-20.gpx`).
- `src/components/member/MemberRoutes.tsx` – načtení RPC, seznam jízd, náhled trasy (statický Mapbox obrázek s polyline, stejný přístup jako `RouteGpxPreview.tsx`, jen bez parsování GPX), dialog s velkou mapou (Mapbox GL, jako v `GpxPreviewMap`), tlačítko stažení, collapsible návod pro Garmin (podle vzoru `GarminDownloadInstructions.tsx`).
- `src/pages/MemberProfile.tsx` – zapojení nové komponenty.

Stopa z Stravy je zjednodušená (bez nadmořské výšky a časů), pro navigaci v Garminu to stačí.
