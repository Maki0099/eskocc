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
    content: "Galerie obsahuje fotky z klubových akcí a vyjížděk.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="gallery-albums"]',
    content: "Procházej jednotlivá alba podle akcí.",
    placement: "top",
  },
];
