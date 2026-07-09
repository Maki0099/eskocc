import { useCountUp } from "@/hooks/useCountUp";
import { useClubStats, formatStatNumber } from "@/hooks/useClubStats";

const HeroStatsLine = () => {
  const { stats } = useClubStats();
  const clubYtdKm = stats?.ytd_km ?? 0;
  const { count: animatedDistance } = useCountUp(clubYtdKm, { duration: 2500 });

  if (!stats || stats.ytd_km <= 0) return null;

  return (
    <p className="text-3xl font-bold opacity-0 animate-fade-up animation-delay-300 text-muted-foreground">
      <span className="tabular-nums">{formatStatNumber(animatedDistance)}</span> km najezdil klub letos
    </p>
  );
};

export default HeroStatsLine;
