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
    content: "Vyplň své jméno a přezdívku, která se bude zobrazovat ostatním členům.",
    placement: "right",
  },
  {
    target: '[data-tour="strava-section"]',
    content: "Propoj svůj Strava účet pro automatické sledování statistik a účast v klubu.",
    placement: "top",
  },
  {
    target: '[data-tour="notifications-section"]',
    content: "Nastav si push notifikace, abys nepropásl/a žádnou důležitou událost.",
    placement: "top",
  },
];

export const eventsSteps: Step[] = [
  {
    target: '[data-tour="events-header"]',
    content: "Přehled všech plánovaných vyjížděk klubu ESKO.cc.",
    disableBeacon: true,
    placement: "bottom",
  },
  {
    target: '[data-tour="events-tabs"]',
    content: "Přepínej mezi nadcházejícími a proběhlými vyjížďkami.",
    placement: "bottom",
  },
  {
    target: '[data-tour="event-card"]',
    content: "Klikni na kartu vyjížďky pro zobrazení detailů a přihlášení.",
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
