export type BeskydyTerrain = "road" | "gravel" | "mtb";
export type BeskydyDifficulty = "easy" | "medium" | "hard";

export interface BeskydyRoute {
  slug: string;
  title: string;
  start: string;
  distanceKm: number;
  elevationM: number;
  terrain: BeskydyTerrain;
  difficulty: BeskydyDifficulty;
  description: string;
  gpxUrl: string;
  mapyUrl?: string;
  komootUrl?: string;
}

const gpx = (slug: string) => `/gpx/beskydy/${slug}.gpx`;

export const BESKYDY_ROUTES: BeskydyRoute[] = [
  {
    slug: "karolinka-solan-velke-karlovice",
    title: "Karolinka – Soláň – Velké Karlovice",
    start: "Karolinka (klubovna ESKO.cc)",
    distanceKm: 45,
    elevationM: 900,
    terrain: "road",
    difficulty: "medium",
    description:
      "Klasický okruh z naší klubovny: výjezd na Soláň (861 m) po hlavní silnici, sjezd do Velkých Karlovic a návrat údolím Vsetínské Bečvy. Skvělý úvod do beskydské cyklistiky.",
    mapyUrl: "https://mapy.cz/turisticka?planovani-trasy&rc=9hAK9xY6mF",
    komootUrl: "https://www.komoot.com/discover/Sol%C3%A1%C5%88/@49.4267,18.2333",
  },
  {
    slug: "pustevny-od-trojanovic",
    title: "Pustevny od Trojanovic",
    start: "Trojanovice",
    distanceKm: 15,
    elevationM: 700,
    terrain: "road",
    difficulty: "hard",
    description:
      "Legendární výjezd ke chatě Pustevny (1 018 m). Kvalitní asfalt, průměrné stoupání 8 %, v horní třetině úseky přes 12 %. Nahoře odměnou Jurkovičovy stavby a výhled na Radhošť.",
    komootUrl: "https://www.komoot.com/discover/Pustevny/@49.4900,18.2900",
  },
  {
    slug: "lysa-hora-z-krasne",
    title: "Lysá hora z Krásné",
    start: "Krásná pod Lysou horou",
    distanceKm: 11,
    elevationM: 1100,
    terrain: "road",
    difficulty: "hard",
    description:
      "Nejvyšší silniční stoupání v Beskydech (1 323 m). 11 km nepřetržitého stoupání s průměrem 9 %, místy přes 14 %. Asfaltová zákazová cesta jen pro pěší a kola.",
    komootUrl: "https://www.komoot.com/discover/Lys%C3%A1+hora/@49.5450,18.4480",
  },
  {
    slug: "bumbalka-okruh",
    title: "Okruh přes Bumbálku",
    start: "Velké Karlovice",
    distanceKm: 38,
    elevationM: 750,
    terrain: "road",
    difficulty: "medium",
    description:
      "Příjemný táhlý výjezd k hraničnímu sedlu Bumbálka (870 m) směrem na Slovensko. Návrat přes Bílou nebo zpět údolím. Tichá silnice, krásné výhledy do Javorníků.",
  },
  {
    slug: "becva-cyklostezka",
    title: "Bečva cyklostezka",
    start: "Karolinka → Vsetín → Valašské Meziříčí",
    distanceKm: 40,
    elevationM: 150,
    terrain: "road",
    difficulty: "easy",
    description:
      "Rovinatá asfaltová cyklostezka podél Vsetínské a Rožnovské Bečvy. Ideální pro rodiny, začátečníky nebo regenerační vyjížďky. Propojuje hlavní obce regionu.",
  },
  {
    slug: "gravel-javorniky",
    title: "Gravel přes hřebeny Javorníků",
    start: "Velké Karlovice – Soláň",
    distanceKm: 55,
    elevationM: 1300,
    terrain: "gravel",
    difficulty: "hard",
    description:
      "Náročný gravelový okruh kombinující lesní cesty Javorníků a asfaltové sjezdy. Většina stoupání po štěrku, terén místy vyžaduje sjezdové zkušenosti. Doporučené pneu od 40 mm.",
  },
];
