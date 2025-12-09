import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useCountUp } from "@/hooks/useCountUp";

const CTASection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const { user } = useAuth();
  const [ytdDistance, setYtdDistance] = useState<number | null>(null);
  const { count: animatedDistance } = useCountUp(isVisible ? ytdDistance : null, { duration: 2000 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('strava_ytd_distance')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.strava_ytd_distance) {
        setYtdDistance(data.strava_ytd_distance);
      }
    };
    fetchStats();
  }, [user]);

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

          {user && ytdDistance !== null && (
            <p className="text-3xl font-bold text-primary mb-4">
              <span className="tabular-nums">{animatedDistance.toLocaleString('cs-CZ')}</span> km letos
            </p>
          )}

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
