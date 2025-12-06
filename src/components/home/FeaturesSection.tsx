import { Calendar, Users, Map, Trophy, Camera, Zap } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Calendar,
    title: "Vyjížďky",
    description: "Pravidelné společné výjezdy pro všechny úrovně.",
  },
  {
    icon: Users,
    title: "Komunita",
    description: "Přátelská atmosféra a podpora od zkušených cyklistů.",
  },
  {
    icon: Map,
    title: "GPX trasy",
    description: "Export tras do vašeho zařízení.",
  },
  {
    icon: Trophy,
    title: "Strava",
    description: "Propojení se Strava klubem.",
  },
  {
    icon: Camera,
    title: "Galerie",
    description: "Vzpomínky z akcí a společných zážitků.",
  },
  {
    icon: Zap,
    title: "Celoročně",
    description: "Aktivní program za každého počasí.",
  },
];

const FeaturesSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();

  return (
    <section className="py-32 bg-secondary/30">
      <div className="container mx-auto">
        <div 
          ref={headerRef}
          className={`text-center mb-20 animate-on-scroll slide-up ${headerVisible ? 'is-visible' : ''}`}
        >
          <p className="text-sm text-muted-foreground mb-4">Proč ESKO.cc</p>
          <h2 className="text-display font-semibold">
            Co nabízíme
          </h2>
        </div>

        <div 
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            // Calculate row and column for staggered delay
            const row = Math.floor(index / 3);
            const col = index % 3;
            const delay = (row * 100) + (col * 100);
            
            return (
              <div
                key={feature.title}
                className={`p-8 rounded-2xl bg-background border border-border/50 hover:border-border transition-all duration-300 hover:-translate-y-1 animate-on-scroll scale-in ${gridVisible ? 'is-visible' : ''}`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                <Icon className="w-8 h-8 mb-6 text-foreground" strokeWidth={1.5} />
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
