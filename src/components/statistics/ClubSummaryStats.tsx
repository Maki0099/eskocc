import { Users, TrendingUp, Trophy, Activity } from "lucide-react";

interface MemberStats {
  id: string;
  ytd_distance: number;
  target: number;
}

interface ClubSummaryStatsProps {
  members: MemberStats[];
  clubTotal: number;
}

const ClubSummaryStats = ({ members, clubTotal }: ClubSummaryStatsProps) => {
  const totalMembers = members.length;
  const membersWithDistance = members.filter((m) => m.ytd_distance > 0);
  const averageDistance =
    membersWithDistance.length > 0 ? Math.round(clubTotal / membersWithDistance.length) : 0;
  const membersCompletedGoal = members.filter(
    (m) => m.target > 0 && m.ytd_distance >= m.target
  ).length;

  const stats = [
    {
      icon: Users,
      label: "Aktivních členů",
      value: totalMembers.toLocaleString(),
      subtext: null as string | null,
    },
    {
      icon: TrendingUp,
      label: "Průměr na člena",
      value: `${averageDistance.toLocaleString()} km`,
      subtext: `z ${membersWithDistance.length} aktivních`,
    },
    {
      icon: Trophy,
      label: "Splnilo cíl",
      value: membersCompletedGoal.toLocaleString(),
      subtext: `z ${totalMembers} členů`,
    },
    {
      icon: Activity,
      label: "Aktivních jezdců",
      value: membersWithDistance.length.toLocaleString(),
      subtext: `s najetými km v ${new Date().getFullYear()}`,
    },
  ];

  return (
    <section
      className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-warm py-10 md:py-12 animate-fade-up"
      aria-label="Souhrnné statistiky klubu"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="space-y-1 animate-fade-up"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <p className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-accent font-medium">
            {stat.label}
          </p>
          <p className="font-display font-bold text-3xl md:text-4xl text-foreground tabular-nums">
            {stat.value}
          </p>
          {stat.subtext && (
            <p className="text-xs text-muted-foreground">{stat.subtext}</p>
          )}
        </div>
      ))}
    </section>
  );
};

export default ClubSummaryStats;
