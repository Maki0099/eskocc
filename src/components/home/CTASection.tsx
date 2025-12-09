import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";

const CTASection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();

  return (
    <section className="py-32 bg-secondary/30">
      <div className="container mx-auto">
        <div 
          ref={ref}
          className={`max-w-2xl mx-auto text-center animate-on-scroll scale-in ${isVisible ? 'is-visible' : ''}`}
        >
          <h2 className="text-display font-semibold mb-6">
            {user ? "Připraven na další vyjížďku?" : "Připraven na další vyjížďku?"}
          </h2>

          <p className="text-lg text-muted-foreground mb-10">
            {user ? "Podívej se, co tě čeká" : "Staň se součástí ESKO.cc"}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link to={ROUTES.EVENTS}>
                  <Button variant="apple" size="lg" className="group">
                    Zobrazit vyjížďky
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <Link to={ROUTES.STATISTICS}>
                  <Button variant="appleOutline" size="lg">
                    Moje statistiky
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to={ROUTES.REGISTER}>
                  <Button variant="apple" size="lg" className="group">
                    Registrovat se
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                <Link to={ROUTES.LOGIN}>
                  <Button variant="appleOutline" size="lg">
                    Přihlásit se
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

export default CTASection;
