import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ClubLocationMap from "@/components/map/ClubLocationMap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Mail, Users, Calendar, Heart } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const values = [
  {
    icon: Users,
    title: "Komunita",
    description: "Přátelská skupina cyklistů všech úrovní. Od začátečníků po zkušené závodníky.",
  },
  {
    icon: Calendar,
    title: "Pravidelné vyjížďky",
    description: "Organizujeme společné vyjížďky po celý rok. V létě i v zimě, ve všední dny i o víkendech.",
  },
  {
    icon: Heart,
    title: "Vášeň pro cyklistiku",
    description: "Spojuje nás láska ke kolu. Sdílíme tipy, zkušenosti a radost z jízdy.",
  },
];

const About = () => {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation();
  const { ref: valuesRef, isVisible: valuesVisible } = useScrollAnimation();
  const { ref: historyRef, isVisible: historyVisible } = useScrollAnimation();
  const { ref: contactRef, isVisible: contactVisible } = useScrollAnimation();
  const { ref: mapRef, isVisible: mapVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-24 pb-16 md:pt-32 md:pb-24">
          <div 
            ref={heroRef}
            className={`max-w-3xl mx-auto text-center animate-on-scroll slide-up ${heroVisible ? 'is-visible' : ''}`}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">O klubu ESKO.cc</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Jsme parta nadšených cyklistů, kteří milují společné vyjížďky, 
              dobrodružství na dvou kolech a přátelskou atmosféru. Ať už jezdíte 
              na silnici nebo v terénu, u nás najdete parťáky na každou trasu.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="container mx-auto px-4 pb-16">
          <div 
            ref={valuesRef}
            className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3"
          >
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card 
                  key={value.title}
                  className={`text-center animate-on-scroll scale-in ${valuesVisible ? 'is-visible' : ''}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <CardContent className="pt-8 pb-6">
                    <Icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div 
              ref={historyRef}
              className={`max-w-3xl mx-auto animate-on-scroll slide-up ${historyVisible ? 'is-visible' : ''}`}
            >
              <h2 className="text-2xl font-bold mb-8 text-center">Historie a činnost</h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  Klub ESKO.cc vznikl z iniciativy skupiny přátel, kteří se pravidelně 
                  scházeli na společných vyjížďkách. Postupně se k nám přidávali další 
                  nadšenci a dnes tvoříme aktivní komunitu cyklistů.
                </p>
                <p className="text-muted-foreground mb-4">
                  Naše aktivity zahrnují:
                </p>
                <ul className="text-muted-foreground space-y-2 mb-4">
                  <li>• Pravidelné skupinové vyjížďky různých obtížností</li>
                  <li>• Víkendové výlety a cyklistické expedice</li>
                  <li>• Společnou účast na závodech a cyklistických akcích</li>
                  <li>• Setkání a společenské akce pro členy klubu</li>
                </ul>
                <p className="text-muted-foreground">
                  Vítáme každého, kdo má rád kolo a chce jezdit v dobré partě. 
                  Nerozhoduje věk ani výkonnost – důležitá je chuť do pedálů!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 
              ref={contactRef}
              className={`text-2xl font-bold mb-8 text-center animate-on-scroll slide-up ${contactVisible ? 'is-visible' : ''}`}
            >
              Kontakt
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card 
                className={`animate-on-scroll slide-in-left ${contactVisible ? 'is-visible' : ''}`}
                style={{ transitionDelay: '100ms' }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 mt-1 text-primary shrink-0" />
                    <div>
                      <h3 className="font-medium mb-1">Email</h3>
                      <a 
                        href="mailto:info@eskocc.cz" 
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        info@eskocc.cz
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`animate-on-scroll slide-in-right ${contactVisible ? 'is-visible' : ''}`}
                style={{ transitionDelay: '100ms' }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 mt-1 text-primary shrink-0" />
                    <div>
                      <h3 className="font-medium mb-1">Adresa</h3>
                      <p className="text-muted-foreground">
                        Vsetínská 85<br />
                        756 05 Karolinka
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div 
              className={`mt-8 text-center animate-on-scroll scale-in ${contactVisible ? 'is-visible' : ''}`}
              style={{ transitionDelay: '200ms' }}
            >
              <p className="text-muted-foreground mb-4">
                Máte zájem se k nám přidat? Zaregistrujte se a staňte se součástí naší komunity!
              </p>
              <Button asChild>
                <Link to="/register">Registrovat se</Link>
              </Button>
            </div>

            {/* Map Section */}
            <div 
              ref={mapRef}
              className={`mt-12 animate-on-scroll slide-up ${mapVisible ? 'is-visible' : ''}`}
            >
              <h3 className="text-lg font-semibold mb-4 text-center">Kde nás najdete</h3>
              <ClubLocationMap className="h-[400px] rounded-xl overflow-hidden shadow-lg" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
