import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Seo from "@/components/Seo";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mountain, Bike, Calendar, Coffee, MapPin, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES, getRouteDetailPath } from "@/lib/routes";
import heroImage from "@/assets/pruvodce-beskydy-hero.jpg";

const FAQ_ITEMS = [
  {
    q: "Kde začít s cyklistikou v Beskydech?",
    a: "Doporučujeme začít na údolních cyklostezkách kolem Bečvy a Vsetínské Bečvy – jsou rovinaté, asfaltové a vhodné pro každého. Postupně můžete přidávat kratší výjezdy ke Karolince, Velkým Karlovicím nebo na Soláň. Inspiraci a konkrétní GPX trasy najdete v naší sekci s klubovými trasami.",
  },
  {
    q: "Která trasa je v Beskydech nejlehčí?",
    a: "Nejlehčí jsou cyklostezky podél řek – například Bečva Cyklostezka, která prochází Karolinkou. Z náročnějších, ale stále dostupných výjezdů doporučujeme Soláň (861 m n. m.) po asfaltu se zvládnutelným stoupáním.",
  },
  {
    q: "Kdy je nejlepší sezóna na cyklistiku v Beskydech?",
    a: "Hlavní sezóna trvá od dubna do října. Květen a červen nabízejí svěží zeleň a méně turistů, září a začátek října jsou ideální díky stabilnímu počasí a barevným lesům. V létě jezděte brzy ráno nebo v podvečer – odpoledne bývají bouřky.",
  },
  {
    q: "Potřebuji na Beskydy horské kolo?",
    a: "Ne nutně. Většinu klubových vyjížděk zvládnete na silničním nebo gravelovém kole po asfaltových silnicích třetích tříd a cyklostezkách. Horské kolo oceníte na lesních cestách kolem Pusteven, Bílé nebo Lysé hory.",
  },
  {
    q: "Jak najdu parťáky na společnou vyjížďku?",
    a: "Přidejte se do klubu ESKO.cc – pravidelně vypisujeme vyjížďky pro všechny úrovně. Aktuální termíny najdete v sekci vyjížděk a po registraci se k nim můžete přihlásit jedním kliknutím.",
  },
  {
    q: "Jsou v Beskydech kavárny vhodné pro cyklisty?",
    a: "Ano, vznikla zde řada cyclist-friendly podniků s úschovou kol a kvalitní kávou. Náš klub provozuje vlastní kavárnu v Karolince, která je přirozeným startem i cílem mnoha tras.",
  },
  {
    q: "Jak je značená cyklistická infrastruktura?",
    a: "Beskydy mají hustou síť značených cyklotras KČT (číselné značení). Hlavní páteřní trasou je Beskydská magistrála. Doporučujeme mít s sebou GPS nebo telefon s offline mapou (Mapy.cz, Komoot).",
  },
];

const PruvodceBeskydy = () => {
  const { data: routes = [] } = useQuery({
    queryKey: ["guide-beskydy-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_routes")
        .select("id, title, distance_km, elevation_m, difficulty, terrain_type, cover_image_url")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Průvodce Beskydy na kole",
    description:
      "Kompletní průvodce cyklistikou v Beskydech – nejlepší trasy, sezóna, vybavení a tipy od klubu ESKO.cc z Karolinky.",
    image: `https://www.eskocc.cz${heroImage}`,
    author: { "@type": "Organization", name: "ESKO.cc" },
    publisher: {
      "@type": "Organization",
      name: "ESKO.cc",
      logo: { "@type": "ImageObject", url: "https://www.eskocc.cz/pwa-512x512.png" },
    },
    mainEntityOfPage: "https://www.eskocc.cz/pruvodce-beskydy",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Průvodce Beskydy na kole | Trasy, tipy a sezóna | ESKO.cc"
        description="Kompletní průvodce cyklistikou v Beskydech: nejlepší trasy, sezóna, vybavení a tipy od klubu ESKO.cc. Silnice, gravel i MTB v Karolince a okolí."
        path="/pruvodce-beskydy"
        type="article"
        jsonLd={[articleJsonLd, faqJsonLd]}
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
                width={1600}
                height={896}
                fetchPriority="high"
                decoding="async"
                className="w-full h-[55vh] md:h-[65vh] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
            </div>
            <div className="container mx-auto px-4 pt-32 pb-16 md:pt-44 md:pb-24 min-h-[55vh] md:min-h-[65vh] flex flex-col justify-end">
              <div className="max-w-3xl">
                <Badge variant="secondary" className="mb-4">Průvodce</Badge>
                <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
                  Průvodce Beskydy na kole
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-6">
                  Vše, co potřebujete vědět o cyklistice v Beskydech – od nejlepších tras
                  přes sezónu až po klubové vyjížďky z Karolinky.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to={ROUTES.EVENTS}>
                      Klubové vyjížďky <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to={ROUTES.REGISTER}>Přidat se ke klubu</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
            {/* Intro */}
            <section className="prose prose-neutral dark:prose-invert max-w-none mb-12">
              <p className="lead text-lg text-muted-foreground">
                Beskydy patří mezi nejkrásnější cyklistické regiony v Česku. Najdete tady
                tiché asfaltové silnice, ostře stoupající horské průsmyky i lesní singletracky.
                V tomto průvodci shrneme všechno podstatné, co potřebujete pro spokojené
                kilometry v sedle.
              </p>
            </section>

            {/* Why Beskydy */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Mountain className="h-7 w-7 text-primary" />
                Proč jezdit v Beskydech
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Moravskoslezské Beskydy nabízejí vše, co cyklista hledá: pestrý terén od
                  rovinatých údolí podél Bečvy až po výjezdy na <strong>Lysou horu</strong>{" "}
                  (1 323 m), <strong>Pustevny</strong>, <strong>Soláň</strong> nebo{" "}
                  <strong>Radhošť</strong>. Krajina je díky nízké hustotě obyvatel a malému
                  provozu jednou z nejpřátelštějších pro silniční i terénní cyklistiku.
                </p>
                <p>
                  Region nabízí přes 600 km značených cyklotras KČT, hustou síť horských
                  bike parků a hlavní páteř – Beskydskou magistrálu. Většina silnic
                  třetích tříd je tichá, kvalitní a vede pohádkovou krajinou.
                </p>
              </div>
            </section>

            {/* Routes */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Bike className="h-7 w-7 text-primary" />
                Nejlepší cyklotrasy v Beskydech
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Náš klub udržuje sbírku ověřených tras s GPX soubory, profily převýšení
                a popisem terénu. Níže najdete výběr nejnovějších – kompletní seznam
                je v sekci{" "}
                <Link to={ROUTES.EVENTS} className="text-primary hover:underline">
                  klubových vyjížděk
                </Link>
                .
              </p>

              <h3 className="text-xl font-semibold mb-4">Doporučené trasy z naší databáze</h3>
              {routes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 mb-8">
                  {routes.map((r) => (
                    <Card key={r.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <Link to={getRouteDetailPath(r.id)} className="block group">
                          <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                            {r.title}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {r.distance_km && <span>{r.distance_km} km</span>}
                            {r.elevation_m && <span>· {r.elevation_m} m ↑</span>}
                            {r.terrain_type && <span>· {r.terrain_type}</span>}
                            {r.difficulty && <span>· {r.difficulty}</span>}
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}

              <h3 className="text-xl font-semibold mb-3 mt-8">Klasické beskydské výjezdy</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Soláň (861 m)</strong> – nejoblíbenější silniční výjezd v okolí Karolinky, ~7 km stoupání s průměrem 6 %.</li>
                <li>• <strong>Pustevny (1 018 m)</strong> – legendární přístup od Trojanovic nebo přes Bílou, kvalitní asfalt.</li>
                <li>• <strong>Lysá hora (1 323 m)</strong> – nejvyšší silniční stoupání v Beskydech, 11 km z Krásné, pro silnější cyklisty.</li>
                <li>• <strong>Bumbálka (870 m)</strong> – hraniční sedlo směrem na Slovensko, příjemný táhlý výjezd.</li>
                <li>• <strong>Bečva Cyklostezka</strong> – rovinatá asfaltka pro rodiny, propojuje Karolinku se Vsetínem a dál.</li>
              </ul>
            </section>

            {/* Season */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6">Sezóna a počasí</h2>
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-2">Jaro (duben–červen)</h3>
                    <p className="text-sm text-muted-foreground">
                      Svěží zeleň, méně turistů, příjemné teploty 12–20 °C. Pozor na zbytky štěrku po zimě.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-2">Léto (červenec–srpen)</h3>
                    <p className="text-sm text-muted-foreground">
                      Hlavní sezóna. Jezděte ráno nebo v podvečer, odpoledne bývají bouřky. Voda s sebou.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-2">Podzim (září–říjen)</h3>
                    <p className="text-sm text-muted-foreground">
                      Stabilní počasí, barevné lesy, ideální pro dlouhé etapy. Brzké stmívání – mějte světla.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Gear */}
            <section className="mb-16">
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
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Coffee className="h-7 w-7 text-primary" />
                Kde se občerstvit
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Cyklisté v Beskydech mají na výběr z desítek kolařských kaváren a hospůdek.
                Mezi klasiku patří horské chaty na Pustevnách, Soláni a Bumbálce. V Karolince
                provozuje náš klub vlastní{" "}
                <Link to={ROUTES.CAFE} className="text-primary hover:underline">
                  kavárnu ESKO.cc
                </Link>
                , která slouží jako přirozený start i cíl většiny našich vyjížděk – kvalitní
                káva, domácí dezerty a úschova kol jsou samozřejmostí.
              </p>
            </section>

            {/* Club rides */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Calendar className="h-7 w-7 text-primary" />
                Klubové akce a vyjížďky
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                ESKO.cc pořádá pravidelné společné vyjížďky pro silnici, gravel i MTB, a to
                pro všechny výkonnostní úrovně. Aktuální termíny, trasy a možnost přihlášení
                najdete v sekci{" "}
                <Link to={ROUTES.EVENTS} className="text-primary hover:underline">
                  vyjížděk
                </Link>
                . Statistiky najetých kilometrů našich členů sledujeme v{" "}
                <Link to={ROUTES.STATISTICS} className="text-primary hover:underline">
                  klubových statistikách
                </Link>
                , fotky z akcí sdílíme v{" "}
                <Link to={ROUTES.GALLERY} className="text-primary hover:underline">
                  galerii
                </Link>
                .
              </p>
            </section>

            {/* Join */}
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <Users className="h-7 w-7 text-primary" />
                Připojte se ke klubu
              </h2>
              <Card className="bg-muted/30">
                <CardContent className="p-6 md:p-8">
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Hledáte parťáky pro pravidelné vyjížďky v Beskydech? Klub ESKO.cc je
                    otevřený všem, kdo mají rádi kolo. Více o nás najdete na stránce{" "}
                    <Link to={ROUTES.ABOUT} className="text-primary hover:underline">
                      O klubu
                    </Link>
                    .
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link to={ROUTES.REGISTER}>Registrovat se</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={ROUTES.ABOUT}>O klubu</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* FAQ */}
            <section className="mb-16">
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
                <MapPin className="h-6 w-6 text-primary" />
                Vyrazte do Beskyd
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Ať už začínáte, nebo máte za sebou tisíce kilometrů, Beskydy si vás získají.
                Projděte si naše{" "}
                <Link to={ROUTES.EVENTS} className="text-primary hover:underline">
                  doporučené trasy
                </Link>
                , přihlaste se na nejbližší klubovou vyjížďku, nebo se rovnou{" "}
                <Link to={ROUTES.REGISTER} className="text-primary hover:underline">
                  staňte členem
                </Link>
                .
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default PruvodceBeskydy;
