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
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <p className="text-sm text-muted-foreground mb-4">Náš tým</p>
          <h2 className="text-display font-semibold">
            Vedení klubu
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {leaders.map((leader) => (
            <div
              key={leader.name}
              className="text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-2xl font-medium text-muted-foreground">
                  {leader.initials}
                </span>
              </div>
              <h3 className="text-lg font-medium mb-1">{leader.name}</h3>
              <p className="text-sm text-muted-foreground">{leader.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LeadershipSection;
