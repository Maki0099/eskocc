import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mountain, Bike, Calendar, Coffee, MapPin, Users, ArrowRight,
  Clock, Home, ChevronRight, ExternalLink, AlertTriangle,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import heroImage from "@/assets/pruvodce-beskydy-hero.jpg";
import photo1 from "@/assets/pruvodce-beskydy-1.jpg";
import photo2 from "@/assets/pruvodce-beskydy-2.jpg";
import photo3 from "@/assets/pruvodce-beskydy-3.jpg";
import photo4 from "@/assets/pruvodce-beskydy-4.jpg";
import { BESKYDY_ROUTES } from "@/data/beskydyRoutes";

const BeskydyOverviewMap = lazy(() => import("@/components/map/BeskydyOverviewMap"));

const FAQ_ITEMS = [
  { q: "Kde začít s cyklistikou v Beskydech?", a: "Doporučujeme začít na údolních cyklostezkách kolem Bečvy a Vsetínské Bečvy – jsou rovinaté, asfaltové a vhodné pro každého. Postupně můžete přidávat kratší výjezdy ke Karolince, Velkým Karlovicím nebo na Soláň." },
  { q: "Která trasa je v Beskydech nejlehčí?", a: "Nejlehčí je Bečva cyklostezka – rovinatá asfaltka podél řeky, vhodná pro rodiny. Z náročnějších, ale stále dostupných výjezdů doporučujeme Soláň (861 m n. m.) po asfaltu se zvládnutelným stoupáním." },
  { q: "Kdy je nejlepší sezóna na cyklistiku v Beskydech?", a: "Hlavní sezóna trvá od dubna do října. Květen a červen nabízejí svěží zeleň a méně turistů, září a začátek října jsou ideální díky stabilnímu počasí a barevným lesům. V létě jezděte brzy ráno nebo v podvečer – odpoledne bývají bouřky." },
  { q: "Potřebuji na Beskydy horské kolo?", a: "Ne nutně. Většinu klubových vyjížděk zvládnete na silničním nebo gravelovém kole po asfaltových silnicích třetích tříd a cyklostezkách. Horské kolo oceníte na lesních cestách kolem Pusteven, Bílé nebo Lysé hory." },
  { q: "Jak najdu parťáky na společnou vyjížďku?", a: "Přidejte se do klubu ESKO.cc – pravidelně vypisujeme vyjížďky pro všechny úrovně. Aktuální termíny najdete v sekci vyjížděk a po registraci se k nim můžete přihlásit jedním kliknutím." },
  { q: "Jsou v Beskydech kavárny vhodné pro cyklisty?", a: "Ano, vznikla zde řada cyclist-friendly podniků s úschovou kol a kvalitní kávou. Náš klub provozuje vlastní kavárnu v Karolince, která je přirozeným startem i cílem mnoha tras." },
  { q: "Jak je značená cyklistická infrastruktura?", a: "Beskydy mají hustou síť značených cyklotras KČT (číselné značení). Hlavní páteřní trasou je Beskydská magistrála. Doporučujeme mít s sebou GPS nebo telefon s offline mapou (Mapy.cz, Komoot)." },
  { q: "Jaké jsou výjezdy vhodné pro elektrokola?", a: "S e-bikem zvládnete prakticky všechny silniční výjezdy včetně Lysé hory, Pusteven nebo Soláně. Počítejte s dojezdem 60–80 km při svižnějším tempu a vyšším převýšení – plánujte trasu s ohledem na nabíjecí body." },
  { q: "Kde nechat auto při výjezdu na Soláň nebo Pustevny?", a: "Pro Soláň využijte parkoviště v Karolince u koupaliště nebo na náměstí, pro Pustevny parkoviště v Trojanovicích-Ráztoce. Obě jsou placená v hlavní sezóně, ale s místem pro kolo." },
  { q: "Existují v Beskydech bikeparky?", a: "Ano, hlavní bikepark je v Bílé (lanovka, několik tratí pro různé úrovně). Singletracky najdete také pod Lysou horou a v okolí Pusteven." },
];

const TOC_ITEMS = [
  { id: "proc", label: "Proč jezdit v Beskydech" },
  { id: "trasy", label: "Nejlepší trasy" },
  { id: "mapa", label: "Mapa regionu" },
  { id: "tabulka", label: "Srovnání výjezdů" },
  { id: "sezona", label: "Sezóna a počasí" },
  { id: "vybaveni", label: "Co si vzít" },
  { id: "obcerstveni", label: "Kde se občerstvit" },
  { id: "klub", label: "Klubové akce" },
  { id: "faq", label: "Časté otázky" },
];

const TERRAIN_LABEL: Record<string, string> = { road: "Silnice", gravel: "Gravel", mtb: "MTB" };
const DIFFICULTY_LABEL: Record<string, string> = { easy: "Lehká", medium: "Střední", hard: "Náročná" };
const DIFFICULTY_VARIANT: Record<string, "secondary" | "default" | "destructive"> = {
  easy: "secondary", medium: "default", hard: "destructive",
};

const UPDATED_DATE = "2026-06-10";
const READING_TIME = "10 min čtení";

const PruvodceBeskydy = () => {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Průvodce Beskydy na kole",
    description: "Kompletní průvodce cyklistikou v Beskydech – nejlepší trasy, sezóna, vybavení a tipy od klubu ESKO.cc z Karolinky.",
    image: `https://www.eskocc.cz${heroImage}`,
    datePublished: "2026-06-08",
    dateModified: UPDATED_DATE,
    author: { "@type": "Organization", name: "ESKO.cc" },
    publisher: {
      "@type": "Organization", name: "ESKO.cc",
      logo: { "@type": "ImageObject", url: "https://www.eskocc.cz/pwa-512x512.png" },
    },
    mainEntityOfPage: "https://www.eskocc.cz/pruvodce-beskydy",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question", name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: "https://www.eskocc.cz/" },
      { "@type": "ListItem", position: 2, name: "Průvodce Beskydy", item: "https://www.eskocc.cz/pruvodce-beskydy" },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Průvodce Beskydy na kole | Trasy, tipy a sezóna | ESKO.cc"
        description="Kompletní průvodce cyklistikou v Beskydech: nejlepší trasy, sezóna, vybavení a tipy od klubu ESKO.cc. Silnice, gravel i MTB v Karolince a okolí."
        path="/pruvodce-beskydy"
        type="article"
        jsonLd={[articleJsonLd, faqJsonLd, breadcrumbJsonLd]}
      />
      <Header />

      <main className="flex-1">
        <article>
          {/* Hero */}
          <section className="relative">
            <div className="absolute inset-0 -z-10">
              <img
                src={heroImage}
                alt="Beskydská krajina s cyklistou na asfaltové silnici za rozbřesku"
                width={1600} height={896}
                fetchPriority="high" decoding="async"
                className="w-full h-[55vh] md:h-[65vh] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
            </div>
            <div className="container mx-auto px-4 pt-32 pb-16 md:pt-44 md:pb-24 min-h-[55vh] md:min-h-[65vh] flex flex-col justify-end">
              <div className="max-w-3xl">
                {/* Breadcrumbs */}
                <nav aria-label="Drobečková navigace" className="mb-4 text-sm text-muted-foreground flex items-center gap-1.5">
                  <Link to={ROUTES.HOME} className="hover:text-foreground flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" /> Domů
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-foreground">Průvodce Beskydy</span>
                </nav>

                <Badge variant="secondary" className="mb-4">Průvodce</Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
                  Průvodce Beskydy na kole
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-4">
                  Vše, co potřebujete vědět o cyklistice v Beskydech – od nejlepších tras
                  přes sezónu až po klubové vyjížďky z Karolinky.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {READING_TIME}</span>
                  <span>Aktualizováno {new Date(UPDATED_DATE).toLocaleDateString("cs-CZ")}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to={ROUTES.EVENTS}>Klubové vyjížďky <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to={ROUTES.REGISTER}>Přidat se ke klubu</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Quick CTA tiles */}
          <section className="container mx-auto px-4 -mt-6 md:-mt-12 relative z-10">
            <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
              <Link to={ROUTES.EVENTS} className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Calendar className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">Klubové vyjížďky</h3>
                      <p className="text-sm text-muted-foreground">Společné jízdy pro každého</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to={ROUTES.CAFE} className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Coffee className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">Kavárna v Karolince</h3>
                      <p className="text-sm text-muted-foreground">Start i cíl většiny tras</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to={ROUTES.STATISTICS} className="group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Bike className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">Statistiky klubu</h3>
                      <p className="text-sm text-muted-foreground">Naše najeté kilometry</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Body with sticky TOC */}
          <div className="container mx-auto px-4 py-12 md:py-16">
            <div className="grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-12 max-w-6xl mx-auto">
              {/* TOC */}
              <aside className="hidden lg:block">
                <nav className="sticky top-24" aria-label="Obsah článku">
                  <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Obsah</h2>
                  <ul className="space-y-2 text-sm">
                    {TOC_ITEMS.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`} className="text-muted-foreground hover:text-primary transition-colors block py-1">
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              <div className="max-w-3xl">
                {/* Intro */}
                <p className="lead text-lg text-muted-foreground mb-12 leading-relaxed">
                  Beskydy patří mezi nejkrásnější cyklistické regiony v Česku. Najdete tady tiché
                  asfaltové silnice, ostře stoupající horské průsmyky i lesní singletracky.
                  V tomto průvodci shrneme všechno podstatné, co potřebujete pro spokojené
                  kilometry v sedle.
                </p>

                {/* Why */}
                <section id="proc" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Mountain className="h-7 w-7 text-primary" /> Proč jezdit v Beskydech
                  </h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      Moravskoslezské Beskydy nabízejí vše, co cyklista hledá: pestrý terén od
                      rovinatých údolí podél Bečvy až po výjezdy na <strong>Lysou horu</strong> (1 323 m),{" "}
                      <strong>Pustevny</strong>, <strong>Soláň</strong> nebo <strong>Radhošť</strong>.
                      Krajina je díky nízké hustotě obyvatel a malému provozu jednou z nejpřátelštějších
                      pro silniční i terénní cyklistiku.
                    </p>
                    <p>
                      Region nabízí přes 600 km značených cyklotras KČT, hustou síť horských bike parků
                      a hlavní páteř – Beskydskou magistrálu. Většina silnic třetích tříd je tichá,
                      kvalitní a vede pohádkovou krajinou.
                    </p>
                  </div>
                </section>

                {/* Routes (static curated) */}
                <section id="trasy" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Bike className="h-7 w-7 text-primary" /> Nejlepší cyklotrasy v Beskydech
                  </h2>
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    Šest ověřených tras, které pravidelně jezdíme z naší klubovny v Karolince.
                    Pokrývají všechny úrovně od rodinné cyklostezky až po nejtěžší výjezd na Lysou horu.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2 mb-8">
                    {BESKYDY_ROUTES.map((r) => (
                      <Card key={r.slug} className="hover:shadow-md transition-shadow flex flex-col">
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold leading-tight">{r.title}</h3>
                            <Badge variant={DIFFICULTY_VARIANT[r.difficulty]} className="shrink-0">
                              {DIFFICULTY_LABEL[r.difficulty]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {r.start}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                            <span className="bg-muted px-2 py-0.5 rounded">{r.distanceKm} km</span>
                            <span className="bg-muted px-2 py-0.5 rounded">{r.elevationM} m ↑</span>
                            <span className="bg-muted px-2 py-0.5 rounded">{TERRAIN_LABEL[r.terrain]}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{r.description}</p>
                          <div className="flex flex-wrap gap-2 mt-auto">
                            {r.mapyUrl && (
                              <a href={r.mapyUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                                Mapy.cz <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {r.komootUrl && (
                              <a href={r.komootUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                                Komoot <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>

                {/* Map */}
                <section id="mapa" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-4">Mapa regionu</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Hlavní cyklistické body Moravskoslezských Beskyd – klubovna, vrcholy a hraniční sedla.
                    Klikněte na marker pro detail.
                  </p>
                  <Suspense fallback={<div className="w-full h-[420px] rounded-lg bg-muted animate-pulse" />}>
                    <BeskydyOverviewMap className="w-full h-[420px]" />
                  </Suspense>
                </section>

                {/* Photo gallery */}
                <section className="mb-16">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { src: photo1, alt: "Klikatá silnice v Beskydech v podzimních barvách" },
                      { src: photo2, alt: "Cyklista stoupá na beskydský průsmyk v létě" },
                      { src: photo3, alt: "Panorama Beskyd z vrcholu Lysé hory za úsvitu" },
                      { src: photo4, alt: "Skupina cyklistů projíždí valašskou vesnicí" },
                    ].map((p, i) => (
                      <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                        <img src={p.src} alt={p.alt} width={1280} height={896}
                          loading="lazy" decoding="async"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Comparison table */}
                <section id="tabulka" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6">Srovnání klíčových výjezdů</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="py-3 pr-4 font-semibold">Výjezd</th>
                          <th className="py-3 pr-4 font-semibold">Vrchol</th>
                          <th className="py-3 pr-4 font-semibold">Délka</th>
                          <th className="py-3 pr-4 font-semibold">⌀ stoupání</th>
                          <th className="py-3 pr-4 font-semibold">Náročnost</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50"><td className="py-3 pr-4 font-medium text-foreground">Soláň</td><td>861 m</td><td>7 km</td><td>6 %</td><td>Střední</td></tr>
                        <tr className="border-b border-border/50"><td className="py-3 pr-4 font-medium text-foreground">Pustevny (Trojanovice)</td><td>1 018 m</td><td>9 km</td><td>8 %</td><td>Náročná</td></tr>
                        <tr className="border-b border-border/50"><td className="py-3 pr-4 font-medium text-foreground">Lysá hora</td><td>1 323 m</td><td>11 km</td><td>9 %</td><td>Náročná</td></tr>
                        <tr className="border-b border-border/50"><td className="py-3 pr-4 font-medium text-foreground">Bumbálka</td><td>870 m</td><td>14 km</td><td>4 %</td><td>Lehká</td></tr>
                        <tr><td className="py-3 pr-4 font-medium text-foreground">Bílá</td><td>590 m</td><td>10 km</td><td>3 %</td><td>Lehká</td></tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Season */}
                <section id="sezona" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6">Sezóna a počasí</h2>
                  <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <Card><CardContent className="p-5">
                      <h3 className="font-semibold mb-2">Jaro (duben–červen)</h3>
                      <p className="text-sm text-muted-foreground">Svěží zeleň, méně turistů, příjemné teploty 12–20 °C. Pozor na zbytky štěrku po zimě.</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-5">
                      <h3 className="font-semibold mb-2">Léto (červenec–srpen)</h3>
                      <p className="text-sm text-muted-foreground">Hlavní sezóna. Jezděte ráno nebo v podvečer, odpoledne bývají bouřky. Voda s sebou.</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-5">
                      <h3 className="font-semibold mb-2">Podzim (září–říjen)</h3>
                      <p className="text-sm text-muted-foreground">Stabilní počasí, barevné lesy, ideální pro dlouhé etapy. Brzké stmívání – mějte světla.</p>
                    </CardContent></Card>
                  </div>
                  <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="p-4 flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Zima v Beskydech:</strong> silnice na Pustevny,
                        Bílou a některé horské průsmyky bývají od listopadu do dubna nesjízdné nebo zasněžené.
                        Aktuální stav komunikací ověřte na{" "}
                        <a href="https://chmi.cz/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ČHMÚ</a>{" "}
                        nebo{" "}
                        <a href="https://www.rsd.cz/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ŘSD</a>.
                      </p>
                    </CardContent>
                  </Card>
                </section>

                {/* Gear */}
                <section id="vybaveni" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6">Co si vzít s sebou</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold mb-3">Základní vybavení</h3>
                      <ul className="space-y-1.5 text-muted-foreground text-sm">
                        <li>• Helma a cyklobrýle</li>
                        <li>• Rukavice a cyklistický dres</li>
                        <li>• Náhradní duše, hustilka, multitool</li>
                        <li>• Telefon s offline mapou (Mapy.cz, Komoot)</li>
                        <li>• 2× láhev s vodou nebo iontovým nápojem</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3">Volba kola</h3>
                      <ul className="space-y-1.5 text-muted-foreground text-sm">
                        <li>• <strong>Silnice:</strong> Soláň, Pustevny, Bumbálka, Beskydská magistrála</li>
                        <li>• <strong>Gravel:</strong> propojení lesních cest a tichých asfaltek</li>
                        <li>• <strong>MTB:</strong> Bike park Bílá, singletracky pod Lysou horou</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Refreshment */}
                <section id="obcerstveni" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Coffee className="h-7 w-7 text-primary" /> Kde se občerstvit
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Cyklisté v Beskydech mají na výběr z desítek kolařských kaváren a hospůdek.
                    Mezi klasiku patří horské chaty na Pustevnách, Soláni a Bumbálce. V Karolince
                    provozuje náš klub vlastní{" "}
                    <Link to={ROUTES.CAFE} className="text-primary hover:underline">kavárnu ESKO.cc</Link>,
                    která slouží jako přirozený start i cíl většiny našich vyjížděk – kvalitní káva,
                    domácí dezerty a úschova kol jsou samozřejmostí.
                  </p>
                </section>

                {/* Club */}
                <section id="klub" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Calendar className="h-7 w-7 text-primary" /> Klubové akce a vyjížďky
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    ESKO.cc pořádá pravidelné společné vyjížďky pro silnici, gravel i MTB, a to pro
                    všechny výkonnostní úrovně. Aktuální termíny najdete v sekci{" "}
                    <Link to={ROUTES.EVENTS} className="text-primary hover:underline">vyjížděk</Link>,
                    statistiky najetých kilometrů sledujeme ve{" "}
                    <Link to={ROUTES.STATISTICS} className="text-primary hover:underline">statistikách</Link>,
                    fotky z akcí sdílíme v{" "}
                    <Link to={ROUTES.GALLERY} className="text-primary hover:underline">galerii</Link>.
                  </p>
                </section>

                {/* Join */}
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                    <Users className="h-7 w-7 text-primary" /> Připojte se ke klubu
                  </h2>
                  <Card className="bg-muted/30">
                    <CardContent className="p-6 md:p-8">
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        Hledáte parťáky pro pravidelné vyjížďky v Beskydech? Klub ESKO.cc je otevřený
                        všem, kdo mají rádi kolo. Více o nás najdete na stránce{" "}
                        <Link to={ROUTES.ABOUT} className="text-primary hover:underline">O klubu</Link>.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button asChild><Link to={ROUTES.REGISTER}>Registrovat se</Link></Button>
                        <Button asChild variant="outline"><Link to={ROUTES.ABOUT}>O klubu</Link></Button>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* FAQ */}
                <section id="faq" className="mb-16 scroll-mt-24">
                  <h2 className="text-3xl font-bold mb-8">Často kladené otázky</h2>
                  <div className="space-y-6">
                    {FAQ_ITEMS.map((item) => (
                      <div key={item.q}>
                        <h3 className="text-lg font-semibold mb-2">{item.q}</h3>
                        <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Conclusion */}
                <section className="border-t border-border/50 pt-12">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" /> Vyrazte do Beskyd
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Ať už začínáte, nebo máte za sebou tisíce kilometrů, Beskydy si vás získají.
                    Projděte si naše{" "}
                    <Link to={ROUTES.EVENTS} className="text-primary hover:underline">doporučené trasy</Link>,
                    přihlaste se na nejbližší klubovou vyjížďku, nebo se rovnou{" "}
                    <Link to={ROUTES.REGISTER} className="text-primary hover:underline">staňte členem</Link>.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default PruvodceBeskydy;
