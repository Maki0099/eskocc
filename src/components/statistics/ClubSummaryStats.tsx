import { Card, CardContent } from "@/components/ui/card";
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
  const membersWithDistance = members.filter(m => m.ytd_distance > 0);
  const averageDistance = membersWithDistance.length > 0
    ? Math.round(clubTotal / membersWithDistance.length)
    : 0;
  const membersCompletedGoal = members.filter(m => m.target > 0 && m.ytd_distance >= m.target).length;

  const stats = [
    {
      icon: Users,
      label: "Aktivních členů",
      value: totalMembers,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: TrendingUp,
      label: "Průměr na člena",
      value: `${averageDistance.toLocaleString()} km`,
      subtext: `z ${membersWithDistance.length} aktivních`,
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      icon: Trophy,
      label: "Splnilo cíl",
      value: membersCompletedGoal,
      subtext: `z ${totalMembers} členů`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      icon: Activity,
      label: "Aktivních jezdců",
      value: membersWithDistance.length,
      subtext: `s najetými km v ${new Date().getFullYear()}`,
      color: "text-accent",
      bgColor: "bg-accent/10"
    }
  ];

  return (
    <Card className="animate-fade-up">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Souhrnné statistiky klubu
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl bg-muted/50 animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              {stat.subtext && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{stat.subtext}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClubSummaryStats;
