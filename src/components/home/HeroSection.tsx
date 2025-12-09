import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroCycling from "@/assets/hero-cycling.jpg";
import logoRoundDark from "@/assets/logo-round-dark.png";
import logoRound from "@/assets/logo-round.png";
import { useParallax } from "@/hooks/useParallax";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";

const HeroSection = () => {
  const { ref: parallaxRef, offset } = useParallax({ speed: 0.4 });
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with Parallax */}
      <div 
        ref={parallaxRef}
        className="absolute inset-0 will-change-transform"
        style={{ 
          transform: `translateY(${offset}px) scale(1.1)`,
        }}
      >
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
          <img 
            src={logoRoundDark} 
            alt="ESKO.cc logo" 
            className="w-24 h-24 mx-auto mb-6 opacity-0 animate-fade-up animation-delay-100 dark:hidden"
          />
          <img 
            src={logoRound} 
            alt="ESKO.cc logo" 
            className="w-24 h-24 mx-auto mb-6 opacity-0 animate-fade-up animation-delay-100 hidden dark:block"
          />
          <p className="text-sm text-muted-foreground mb-6 opacity-0 animate-fade-up animation-delay-150">
            Cyklistický klub Esko.cc
          </p>

          <h1 className="text-hero font-semibold mb-4 opacity-0 animate-fade-up animation-delay-200">
            Jezdi tak dlouho,
            <br />
            <span className="text-muted-foreground">nebo krátce jak zvládáš.</span>
            <br />
            <span className="text-gradient">Ale jezdi.</span>
          </h1>

          <p className="text-xs text-muted-foreground mb-10 opacity-0 animate-fade-up animation-delay-250">
            — Eddy Merckx
          </p>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto opacity-0 animate-fade-up animation-delay-300">
            Přidej se k naší komunitě cyklistů. Společné vyjížďky, nezapomenutelné zážitky.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-up animation-delay-400">
            {user ? (
              <>
                <Link to={ROUTES.STATISTICS}>
                  <Button variant="apple" size="lg" className="group">
                    Zobrazit statistiky
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <Link to={ROUTES.EVENTS}>
                  <Button variant="appleOutline" size="lg">
                    Nadcházející vyjížďky
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to={ROUTES.REGISTER}>
                  <Button variant="apple" size="lg" className="group">
                    Připojit se ke klubu
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <Link to={ROUTES.EVENTS}>
                  <Button variant="appleOutline" size="lg">
                    Zobrazit vyjížďky
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
