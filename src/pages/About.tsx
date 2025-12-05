import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Mail, Users, Calendar, Trophy, Heart } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
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
          <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <Users className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Komunita</h3>
                <p className="text-sm text-muted-foreground">
                  Přátelská skupina cyklistů všech úrovní. Od začátečníků po zkušené závodníky.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <Calendar className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Pravidelné vyjížďky</h3>
                <p className="text-sm text-muted-foreground">
                  Organizujeme společné vyjížďky po celý rok. V létě i v zimě, ve všední dny i o víkendech.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <Heart className="w-10 h-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold text-lg mb-2">Vášeň pro cyklistiku</h3>
                <p className="text-sm text-muted-foreground">
                  Spojuje nás láska ke kolu. Sdílíme tipy, zkušenosti a radost z jízdy.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
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
            <h2 className="text-2xl font-bold mb-8 text-center">Kontakt</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 mt-1 text-primary shrink-0" />
                    <div>
                      <h3 className="font-medium mb-1">Email</h3>
                      <a 
                        href="mailto:info@esko.cc" 
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        info@esko.cc
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 mt-1 text-primary shrink-0" />
                    <div>
                      <h3 className="font-medium mb-1">Sraz</h3>
                      <p className="text-muted-foreground">
                        Místo srazu se liší dle aktuální vyjížďky
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4">
                Máte zájem se k nám přidat? Zaregistrujte se a staňte se součástí naší komunity!
              </p>
              <Button asChild>
                <a href="/register">Registrovat se</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
