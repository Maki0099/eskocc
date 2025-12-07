import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const leaders = [
  {
    name: "Pavel Stráský",
    role: "Prezident",
    initials: "PS",
  },
  {
    name: "Zbyněk Kuřil",
    role: "Tajemník",
    initials: "ZK",
  },
  {
    name: "Laďa Sušil",
    role: "Kapitán",
    initials: "LS",
  },
];

const LeadershipSection = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className="py-16 bg-secondary/30 border-t border-border/50">
      <div className="container mx-auto">
        <div 
          ref={ref}
          className={`flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 animate-on-scroll fade-up ${isVisible ? 'is-visible' : ''}`}
        >
          <p className="text-sm text-muted-foreground">Vedení klubu</p>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {leaders.map((leader) => (
              <div
                key={leader.name}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    {leader.initials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{leader.name}</p>
                  <p className="text-xs text-muted-foreground">{leader.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadershipSection;
