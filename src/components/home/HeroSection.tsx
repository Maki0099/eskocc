import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users } from "lucide-react";
import heroCycling from "@/assets/hero-cycling.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroCycling}
          alt="Cyklisté při západu slunce"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-slide-up opacity-0 animation-delay-100">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Cyklistický klub Brno</span>
          </div>

          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6 animate-slide-up opacity-0 animation-delay-200">
            ESKO<span className="gradient-text">CC</span>
          </h1>

          <blockquote className="text-xl md:text-2xl text-muted-foreground mb-8 border-l-4 border-primary pl-6 italic animate-slide-up opacity-0 animation-delay-300">
            „Jezdi tak dlouho, nebo krátce jak zvládáš,{" "}
            <span className="text-foreground font-semibold not-italic">ALE JEZDI</span>"
            <footer className="text-sm mt-2 text-primary not-italic">— Eddy Merckx</footer>
          </blockquote>

          <p className="text-lg text-muted-foreground mb-8 max-w-xl animate-slide-up opacity-0 animation-delay-400">
            Přidej se k naší komunitě cyklistů. Společné vyjížďky, nezapomenutelné zážitky a přátelská atmosféra.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
            <Link to="/register">
              <Button variant="hero" size="lg" className="group">
                Připojit se ke klubu
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="heroOutline" size="lg">
                Zobrazit vyjížďky
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">Scroll</span>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-primary rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
