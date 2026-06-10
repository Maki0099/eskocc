export interface BeskydyPoi {
  id: string;
  name: string;
  description: string;
  lng: number;
  lat: number;
  type: "club" | "summit" | "pass" | "cafe";
}

export const BESKYDY_POIS: BeskydyPoi[] = [
  { id: "klubovna", name: "Klubovna ESKO.cc", description: "Karolinka, Vsetínská 85 – výchozí bod většiny vyjížděk.", lng: 18.2401, lat: 49.3513, type: "club" },
  { id: "solan", name: "Soláň", description: "861 m – nejoblíbenější silniční výjezd v okolí.", lng: 18.2570, lat: 49.4267, type: "summit" },
  { id: "pustevny", name: "Pustevny", description: "1 018 m – Jurkovičovy stavby a výhled na Radhošť.", lng: 18.2922, lat: 49.4906, type: "summit" },
  { id: "radhost", name: "Radhošť", description: "1 129 m – posvátná hora s kaplí sv. Cyrila a Metoděje.", lng: 18.2806, lat: 49.4878, type: "summit" },
  { id: "lysahora", name: "Lysá hora", description: "1 323 m – nejvyšší vrchol Moravskoslezských Beskyd.", lng: 18.4475, lat: 49.5461, type: "summit" },
  { id: "bumbalka", name: "Bumbálka", description: "870 m – hraniční sedlo směrem na Slovensko.", lng: 18.4006, lat: 49.3914, type: "pass" },
  { id: "bila", name: "Bílá", description: "Výchozí bod pro bikepark a okruhy směrem na Klepáč.", lng: 18.4517, lat: 49.4789, type: "pass" },
];
