import { Step } from "react-joyride";

export const dashboardSteps: Step[] = [
  {
    target: '[data-tour="welcome"]',
    content: "Vítej v aplikaci ESKO.cc! Tento průvodce ti ukáže hlavní funkce.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="quick-actions"]',
    content: "Zde najdeš rychlý přístup k hlavním sekcím aplikace - vyjížďky, galerie a nastavení účtu.",
    placement: "top",
  },
  {
    target: '[data-tour="events-widget"]',
    content: "Widget nadcházejících vyjížděk ti ukazuje nejbližší plánované akce. Můžeš se rovnou přihlásit.",
    placement: "top",
  },
  {
    target: '[data-tour="challenge-widget"]',
    content: "Zde sleduješ svůj pokrok v ročním kilometrovém cíli.",
    placement: "top",
  },
  {
    target: '[data-tour="strava-widget"]',
    content: "Propojení se Stravou ti umožní automaticky sledovat najeté kilometry a statistiky.",
    placement: "top",
  },
  {
    target: '[data-tour="profile"]',
    content: "Kliknutím na svůj profil se dostaneš do nastavení účtu, kde můžeš upravit své údaje.",
    placement: "top",
  },
  {
    target: '[data-tour="help-button"]',
    content: "Kdykoliv můžeš spustit průvodce znovu kliknutím na toto tlačítko.",
    placement: "bottom",
  },
];

export const accountSteps: Step[] = [
  {
    target: '[data-tour="account-header"]',
    content: "Zde můžeš upravit své osobní údaje a nastavení účtu.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="personal-info"]',
    content: "Vyplň své jméno, přezdívku a datum narození. Přezdívka se bude zobrazovat ostatním členům.",
    placement: "top",
  },
  {
    target: '[data-tour="strava-section"]',
    content: "Propoj svůj Strava účet pro automatické sledování najetých kilometrů a účast v klubovém žebříčku.",
    placement: "top",
  },
  {
    target: '[data-tour="notifications-section"]',
    content: "Zapni si push notifikace, abys nepropásl/a žádnou důležitou událost nebo změnu ve vyjížďkách.",
    placement: "top",
  },
  {
    target: '[data-tour="tour-restart"]',
    content: "Kdykoliv můžeš resetovat průvodce a projít si ho znovu.",
    placement: "top",
  },
];

export const eventsSteps: Step[] = [
  {
    target: '[data-tour="events-header"]',
    content: "Přehled všech plánovaných vyjížděk klubu ESKO.cc. Zde najdeš informace o nadcházejících akcích.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="events-tabs"]',
    content: "Přepínej mezi nadcházejícími vyjížďkami, historií proběhlých akcí a oblíbenými trasami.",
    placement: "bottom",
  },
  {
    target: '[data-tour="event-card"]',
    content: "Karta vyjížďky zobrazuje datum, místo, obtížnost a počet účastníků. Klikni pro zobrazení detailu.",
    placement: "top",
  },
  {
    target: '[data-tour="event-list"]',
    content: "U každé vyjížďky se můžeš přihlásit tlačítkem 'Přihlásit'. Po přihlášení budeš dostávat notifikace o změnách.",
    placement: "top",
  },
];

export const gallerySteps: Step[] = [
  {
    target: '[data-tour="gallery-header"]',
    content: "Fotogalerie klubu ESKO.cc - zde najdeš fotky z akcí a vyjížděk.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="gallery-albums"]',
    content: "Externí alba z Google Photos obsahují fotky z vícedenních výjezdů jako Mallorca. Kliknutím se otevřou v novém okně.",
    placement: "top",
  },
  {
    target: '[data-tour="gallery-tabs"]',
    content: "Přepínej mezi všemi fotkami, fotkami z vyjížděk nebo ostatními. Můžeš také nahrát vlastní fotky.",
    placement: "top",
  },
];

export const eventDetailSteps: Step[] = [
  {
    target: '[data-tour="event-title"]',
    content: "Detail vyjížďky obsahuje všechny důležité informace o akci.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="event-map"]',
    content: "Mapa zobrazuje trasu vyjížďky nebo místo startu. Můžeš si trasu prohlédnout a stáhnout GPX soubor.",
    placement: "top",
  },
  {
    target: '[data-tour="event-info"]',
    content: "Zde najdeš datum, čas, místo a popis vyjížďky. Můžeš se také přihlásit nebo stáhnout GPX.",
    placement: "top",
  },
  {
    target: '[data-tour="event-participants"]',
    content: "Seznam přihlášených účastníků. Kliknutím na jméno zobrazíš profil člena.",
    placement: "top",
  },
  {
  target: '[data-tour="event-photos"]',
    content: "Po vyjížďce zde můžeš nahrát fotky a prohlédnout si fotky od ostatních.",
    placement: "top",
  },
];

export const statisticsSteps: Step[] = [
  {
    target: '[data-tour="statistics-header"]',
    content: "Statistiky klubu zobrazují pokrok členů ve splnění ročního kilometrového cíle.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="club-goal"]',
    content: "Klubový cíl ukazuje společný pokrok všech členů. Společně můžeme dosáhnout cíle!",
    placement: "top",
  },
  {
    target: '[data-tour="age-categories"]',
    content: "Cíle jsou rozděleny podle věkových kategorií. Každá kategorie má svůj vlastní kilometrový cíl.",
    placement: "top",
  },
  {
    target: '[data-tour="leaderboard"]',
    content: "Žebříček zobrazuje pořadí členů podle najetých kilometrů. Tvoje pozice je zvýrazněna.",
    placement: "top",
  },
  {
    target: '[data-tour="refresh-stats"]',
    content: "Tlačítkem můžeš aktualizovat statistiky z propojených Strava účtů.",
    placement: "bottom",
  },
];

export const routeDetailSteps: Step[] = [
  {
    target: '[data-tour="route-title"]',
    content: "Detail trasy obsahuje všechny důležité informace o oblíbené trase.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="route-params"]',
    content: "Zde najdeš parametry trasy - vzdálenost, převýšení, obtížnost a typ terénu.",
    placement: "top",
  },
  {
    target: '[data-tour="route-map"]',
    content: "Mapa zobrazuje průběh trasy. Můžeš ji prozkoumat a stáhnout GPX soubor.",
    placement: "top",
  },
  {
    target: '[data-tour="route-actions"]',
    content: "Stáhni GPX pro navigaci nebo vytvoř vyjížďku přímo z této trasy.",
    placement: "top",
  },
  {
    target: '[data-tour="route-photos"]',
    content: "Nahraj fotky z jízdy po této trase a prohlédni si fotky ostatních.",
    placement: "top",
  },
];

export const notificationsSteps: Step[] = [
  {
    target: '[data-tour="notifications-header"]',
    content: "Přehled všech tvých notifikací. Nepropásneš žádnou důležitou informaci.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="notifications-filter"]',
    content: "Filtruj notifikace - zobraz všechny nebo jen nepřečtené.",
    placement: "bottom",
  },
  {
    target: '[data-tour="notifications-actions"]',
    content: "Hromadně označ všechny jako přečtené nebo smaž přečtené notifikace.",
    placement: "bottom",
  },
  {
    target: '[data-tour="notifications-list"]',
    content: "Kliknutím na notifikaci se dostaneš na detail události. U každé můžeš označit jako přečteno nebo smazat.",
    placement: "top",
  },
];

export const memberProfileSteps: Step[] = [
  {
    target: '[data-tour="member-info"]',
    content: "Profil člena zobrazuje základní informace a statistiky.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="member-strava"]',
    content: "Propojení se Stravou umožňuje zobrazit statistiky a odkaz na Strava profil.",
    placement: "top",
  },
  {
    target: '[data-tour="member-stats"]',
    content: "Přehled statistik člena - počet účastí na vyjížďkách a rok registrace.",
    placement: "top",
  },
  {
    target: '[data-tour="member-events"]',
    content: "Historie účastí na vyjížďkách. Kliknutím se dostaneš na detail akce.",
    placement: "top",
  },
];
