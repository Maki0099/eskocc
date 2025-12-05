import { Calendar, Users, Trophy, Camera, Map, Zap } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Plánované vyjížďky",
    description: "Pravidelné společné vyjížďky s různou náročností pro všechny úrovně.",
  },
  {
    icon: Users,
    title: "Silná komunita",
    description: "Přátelská atmosféra a podpora od zkušených cyklistů.",
  },
  {
    icon: Map,
    title: "GPX trasy",
    description: "Export tras do vašeho Garminu nebo jiného zařízení.",
  },
  {
    icon: Trophy,
    title: "Strava propojení",
    description: "Sledujte své výkony a porovnávejte se s ostatními členy.",
  },
  {
    icon: Camera,
    title: "Fotogalerie",
    description: "Vzpomínky z akcí a společných zážitků.",
  },
  {
    icon: Zap,
    title: "Aktivní klub",
    description: "Celoroční program s výjezdy za každého počasí.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-widest">Proč EskoCC</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4">
            Co nabízíme
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Víc než jen cyklistický klub. Jsme komunita lidí, kteří milují kola a dobrodružství.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
