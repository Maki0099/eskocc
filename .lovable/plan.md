# Oprava: trasy na mapě klubu se zobrazí až po kliknutí na filtr

## Co se děje

Na stránce Mapa klubu se mapa načte, ale trasy a startovní body se objeví až ve chvíli, kdy uživatel klikne na některý filtr („Vše", „Venku", „Virtuální") nebo na jiné období. Data přitom už načtená jsou.

## Příčina

Vykreslení tras se spouští hned po načtení dat, ale v tu chvíli mapa ještě nemá připravenou vrstvu, do které se trasy kreslí. Kód se v takovém případě pokusí data zapsat „naprázdno" a už to nikdy nezopakuje. Teprve kliknutí na filtr vykreslení spustí znovu — a to už vrstva existuje, takže se trasy objeví.

## Řešení

1. Do stránky přidat stav „mapa je připravená", který se nastaví až poté, co jsou v mapě skutečně vytvořené vrstvy pro trasy.
2. Vykreslování tras a startovních bodů navázat na tento stav — jakmile je mapa připravená, trasy se vykreslí automaticky, bez zásahu uživatele.
3. Stejně ošetřit i zvýraznění vybrané trasy, aby fungovalo hned po prvním načtení.
4. Odstranit nespolehlivé čekání na událost načtení mapy, které způsobovalo, že se vykreslení někdy nikdy nespustilo.

## Technické poznámky

- Soubor: `src/pages/ClubMap.tsx`.
- Nový stav `mapReady` nastavený na konci `map.on("load", …)` po `addSource`/`addLayer`; při odstranění mapy se resetuje na `false`.
- Efekty pro `updateLayers` a `applySelection` budou mít v závislostech `mapReady` a místo `m.loaded()` / `m.once("load", …)` použijí přímou kontrolu `mapReady && m.getSource("route-lines")`.
- Bez změn v databázi, RPC ani v logice filtrů.
- Ověření: build + kontrola v prohlížeči, že po otevření `/mapa-klubu` jsou trasy vidět bez kliknutí na filtr.
