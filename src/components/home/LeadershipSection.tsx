import { Crown, Shield, Flag } from "lucide-react";

const leaders = [
  {
    name: "Pavel Stráský",
    role: "Prezident",
    icon: Crown,
    description: "Vedení klubu a strategické rozhodování",
  },
  {
    name: "Zbyněk Kuřil",
    role: "Tajemník",
    icon: Shield,
    description: "Organizace a administrativa klubu",
  },
  {
    name: "Laďa Sušil",
    role: "Kapitán",
    icon: Flag,
    description: "Vedení vyjížděk a sportovní aktivity",
  },
];

const LeadershipSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-widest">Náš tým</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4">
            Vedení klubu
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Lidé, kteří stojí za úspěchem EskoCC a starají se o to, aby každá vyjížďka byla nezapomenutelná.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {leaders.map((leader, index) => {
            const Icon = leader.icon;
            return (
              <div
                key={leader.name}
                className="group relative bg-card rounded-2xl p-8 text-center card-glow border border-border hover:border-primary/50 transition-all"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-10 h-10 text-primary" />
                </div>

                {/* Avatar Placeholder */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-3xl font-heading font-bold text-muted-foreground">
                  {leader.name.split(' ').map(n => n[0]).join('')}
                </div>

                <h3 className="font-heading text-2xl font-semibold mb-1">{leader.name}</h3>
                <p className="text-primary font-medium text-sm uppercase tracking-wider mb-3">{leader.role}</p>
                <p className="text-muted-foreground text-sm">{leader.description}</p>

                {/* Decorative gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LeadershipSection;
