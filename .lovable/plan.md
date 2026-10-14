# Průvodce se nespustí sám, jen na kliknutí

## Cíl
Až dnes se na pěti stránkách průvodce rozjel sám (půl sekundy po načtení, pokud si ho uživatel ještě „neodskocal“). To maže – člověk chce mrknout na statistiky a přitom mu přes obrazovku svítí rámečky. Po úpravě se průvodce objeví jen tehdy, když uživatel klikne na tlačítko s otazníkem.

## Co se mění
- **Pět stránek** přestane průvodce spouštět automaticky: Dashboard, Statistiky, detail trasy, profil člena, Notifikace. Zbylé stránky (Úvod, Vyjížďky, Galerie, detail vyjížďky, Nastavení účtu) se chovají stejně jako teď – průvodce šel jen z tlačítka.
- **Tlačítka pro spuštění zůstávají** na všech stránkách: otazník v horní liště a otazník přímo v hlavičceeach stránek. Kdo chce průvodce, klikne.
- **Text u resetu v Nastavení účtu** se upraví. Dnes slibuje „Průvodce se znovu zobrazí při další návštěvě dashboardu“, což přestane platit. Nově: reset znovu zobrazí tlačítka s nápovědou na stránkách.
- **Úklid v kódu**: odstraní se funkce `shouldAutoStart`, kterou už nikdo nebude používat.

## Co zůstává stejné
- Průvodce na stránkách, kde se nikdy nespouštěl automaticky (Úvod, Vyjížďky, Galerie, detail vyjížďky, Nastavení účtu).
- Tlačítko „Resetovat průvodce aplikací“ v Nastavení účtu.
- Po dokončení průvodce se stránka označí jako „prošel“ a tlačítko s otazníkem na ní zmizí – stejně jako dnes.

## Technické detaily
- `src/pages/Dashboard.tsx`: smazat `useEffect` s `shouldAutoStart("dashboard")` (ř. 39–49) a `autoStartChecked` ref; z importu vypustit `useEffect, useRef`.
- `src/pages/Statistics.tsx` (ř. 111–116), `src/pages/RouteDetail.tsx` (ř. 108–113), `src/pages/MemberProfile.tsx` (ř. 76–81), `src/pages/Notifications.tsx` (ř. 144–149): smazat `useEffect` s `setTimeout(handleStartTour, 500)`; z dekonstrukce `useTour()` vypustit `shouldAutoStart`.
- `src/hooks/useTour.ts`: odstranit `shouldAutoStart` z rozhraní `UseTourReturn`, z implementace i z return objektu; `startTour`, `markTourCompleted` (používá `TourProvider`), `resetAllTours` a `isTourCompleted` zůstávají.
- `src/pages/Account.tsx` (ř. 441–443): text „Průvodce se znovu zobrazí při další návštěvě dashboardu“ nahradit popisem, že reset znovu zobrazí tlačítka s nápovědou.
- `src/components/layout/Header.tsx` a `src/components/tour/TourProvider.tsx` beze změny.
- Poznámka do paměti projektu: původní pravidlo o automatickém startu pro nové uživatele se nahrazuje pravidlem „průvodce jen na vyžádání“.

## Ověření
- Build bez chyb (`/tmp/observability/build-errors.log`).
- V náhledu s přihlášeným účtem: otevřít Dashboard, Statistiky, detail trasy, profil člena a Notifikace – průvodce se nespustí sám; klik na otazník ho spustí, dokončení ho vypne.
- Mobilní menu a překrytí průvodce bez chyb v konzoli.
