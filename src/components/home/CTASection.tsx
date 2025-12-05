import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bike } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-8 animate-float">
            <Bike className="w-10 h-10 text-primary-foreground" />
          </div>

          <h2 className="font-heading text-4xl md:text-6xl font-bold mb-6">
            Připraven na{" "}
            <span className="gradient-text">další vyjížďku?</span>
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Staň se součástí EskoCC a objevuj nové trasy, poznávej skvělé lidi a posouvej své limity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="hero" size="lg" className="group">
                Registrovat se zdarma
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="heroOutline" size="lg">
                Už mám účet
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Registrace je zdarma. Schválení členství probíhá do 24 hodin.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
