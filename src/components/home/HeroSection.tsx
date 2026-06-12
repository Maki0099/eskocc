import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useParallax } from "@/hooks/useParallax";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";

const HeroStatsLine = lazy(() => import("./HeroStatsLine"));

const HERO_WEBP = "/hero-cycling.webp";
const HERO_JPG = "/hero-cycling.jpg";
const LOGO_LIGHT = "/logo-round-dark.png";
const LOGO_DARK = "/logo-round.png";

const HeroSection = () => {
  const { ref: parallaxRef, offset } = useParallax({ speed: 0.4 });
  const { user } = useAuth();

  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with Parallax */}
      <div ref={parallaxRef} className="absolute inset-0 will-change-transform" style={{
      transform: `translateY(${offset}px) scale(1.1)`
    }}>
        <picture>
          <source srcSet={HERO_WEBP} type="image/webp" />
          <img src={HERO_JPG} alt="Cyklisté při západu slunce" width={1600} height={900} fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-background/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-14">
        <div className="max-w-3xl mx-auto text-center">
          <img src={LOGO_LIGHT} alt="ESKO.cc logo" width={96} height={96} className="w-24 h-24 mx-auto mb-6 dark:hidden" />
          <img src={LOGO_DARK} alt="ESKO.cc logo" width={96} height={96} className="w-24 h-24 mx-auto mb-6 hidden dark:block" />
          <p className="text-sm text-muted-foreground mb-6">
            Cyklistický klub Esko.cc
          </p>

          <h1 className="sr-only">Cyklistický klub ESKO.cc Karolinka — Jezdi tak dlouho, jak zvládáš</h1>
          <div aria-hidden="true" className="text-hero font-semibold mb-4">
            Jezdi tak dlouho,
            <br />
            <span className="text-muted-foreground">nebo krátce jak zvládáš.</span>
            <br />
            <span className="text-gradient">Ale jezdi.</span>
          </div>

          <p className="text-xs text-muted-foreground mb-10">
            — Eddy Merckx
          </p>

          <Suspense fallback={null}>
            <HeroStatsLine />
          </Suspense>

          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            {user ? "Kam to dnes natočíš?" : "Přidej se k naší komunitě cyklistů. Společné vyjížďky, nezapomenutelné zážitky."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? <>
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
              </> : <>
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
              </>}
          </div>
        </div>
      </div>
    </section>;
};
export default HeroSection;
