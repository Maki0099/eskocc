import { Calendar, Users, Map, Trophy, Camera, Zap, type LucideIcon } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  size: "small" | "medium" | "large";
}

const features: Feature[] = [
  {
    icon: Calendar,
    title: "Vyjížďky",
    description: "Pravidelné společné výjezdy pro všechny úrovně zdatnosti. Od relaxačních projížděk po náročné tréninky.",
    stat: "100+",
    statLabel: "ročně",
    size: "large",
  },
  {
    icon: Users,
    title: "Komunita",
    description: "Přátelská atmosféra a podpora od zkušených cyklistů.",
    stat: "200+",
    statLabel: "členů",
    size: "medium",
  },
  {
    icon: Map,
    title: "GPX trasy",
    description: "Export tras do vašeho zařízení.",
    stat: "500+",
    statLabel: "tras",
    size: "small",
  },
  {
    icon: Trophy,
    title: "Strava",
    description: "Propojení se Strava klubem pro sledování výkonů.",
    stat: "∞",
    statLabel: "segmentů",
    size: "small",
  },
  {
    icon: Camera,
    title: "Galerie",
    description: "Vzpomínky z akcí a společných zážitků zachycené na fotkách.",
    stat: "1000+",
    statLabel: "fotek",
    size: "medium",
  },
  {
    icon: Zap,
    title: "Celoročně",
    description: "Aktivní program za každého počasí.",
    stat: "12",
    statLabel: "měsíců",
    size: "small",
  },
];

const FeatureCard = ({ 
  feature, 
  index, 
  isVisible 
}: { 
  feature: Feature; 
  index: number; 
  isVisible: boolean;
}) => {
  const Icon = feature.icon;
  const delay = index * 100;
  
  const sizeClasses = {
    small: "md:col-span-1 md:row-span-1",
    medium: "md:col-span-1 md:row-span-1",
    large: "md:col-span-2 md:row-span-1",
  };

  return (
    <div
      className={`
        group relative overflow-hidden
        p-6 md:p-8 rounded-2xl
        bg-background border border-border/50
        transition-all duration-500 ease-out
        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
        hover:-translate-y-1
        animate-on-scroll fade-up ${isVisible ? 'is-visible' : ''}
        ${sizeClasses[feature.size]}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Icon with gradient background */}
        <div className="mb-6 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center group-hover:scale-110 group-hover:from-primary/20 group-hover:to-primary/5 transition-all duration-300">
            <Icon 
              className="w-7 h-7 text-foreground/80 group-hover:text-foreground transition-colors duration-300" 
              strokeWidth={1.5} 
            />
          </div>
        </div>

        {/* Title and description */}
        <h3 className="text-xl font-semibold mb-2 group-hover:text-foreground transition-colors">
          {feature.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed flex-grow">
          {feature.description}
        </p>

        {/* Stats */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {feature.stat}
            </span>
            <span className="text-sm text-muted-foreground">
              {feature.statLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeaturesSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation();

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-secondary/30" />
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      
      <div className="container mx-auto relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 animate-on-scroll fade-up ${headerVisible ? 'is-visible' : ''}`}
        >
          <p className="text-sm text-muted-foreground mb-4 tracking-wide uppercase">
            Proč ESKO.cc
          </p>
          <h2 className="text-display font-semibold mb-4">
            Co nabízíme
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Připojte se k aktivní komunitě cyklistů a objevte radost ze společného ježdění.
          </p>
        </div>

        {/* Bento Grid */}
        <div 
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto"
        >
          {/* Row 1: Large + Medium */}
          <div className="md:col-span-2">
            <FeatureCard feature={features[0]} index={0} isVisible={gridVisible} />
          </div>
          <div className="md:col-span-2">
            <FeatureCard feature={features[1]} index={1} isVisible={gridVisible} />
          </div>
          
          {/* Row 2: 3 small cards */}
          <div className="md:col-span-1">
            <FeatureCard feature={features[2]} index={2} isVisible={gridVisible} />
          </div>
          <div className="md:col-span-1">
            <FeatureCard feature={features[3]} index={3} isVisible={gridVisible} />
          </div>
          <div className="md:col-span-1">
            <FeatureCard feature={features[4]} index={4} isVisible={gridVisible} />
          </div>
          <div className="md:col-span-1">
            <FeatureCard feature={features[5]} index={5} isVisible={gridVisible} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
