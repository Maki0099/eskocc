import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const CTASection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-32 bg-secondary/30">
      <div className="container mx-auto">
        <div 
          ref={ref}
          className={`max-w-2xl mx-auto text-center animate-on-scroll scale-in ${isVisible ? 'is-visible' : ''}`}
        >
          <h2 className="text-display font-semibold mb-6">
            Připraven na další vyjížďku?
          </h2>

          <p className="text-lg text-muted-foreground mb-10">
            Staň se součástí ESKO.cc
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="apple" size="lg" className="group">
                Registrovat se
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="appleOutline" size="lg">
                Přihlásit se
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
