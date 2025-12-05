import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroCycling from "@/assets/hero-cycling.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroCycling}
          alt="Cyklisté při západu slunce"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-14">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-6 opacity-0 animate-fade-up animation-delay-100">
            Cyklistický klub Brno
          </p>

          <h1 className="text-hero font-semibold mb-8 opacity-0 animate-fade-up animation-delay-200">
            Jezdi tak dlouho,
            <br />
            <span className="text-muted-foreground">nebo krátce jak zvládáš.</span>
            <br />
            <span className="text-gradient">Ale jezdi.</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto opacity-0 animate-fade-up animation-delay-300">
            Přidej se k naší komunitě cyklistů. Společné vyjížďky, nezapomenutelné zážitky.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-up animation-delay-400">
            <Link to="/register">
              <Button variant="apple" size="lg" className="group">
                Připojit se ke klubu
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="appleOutline" size="lg">
                Zobrazit vyjížďky
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-8 opacity-0 animate-fade-up animation-delay-500">
            — Eddy Merckx
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
