import Seo from "@/components/Seo";
import { useEffect, useRef, useState } from "react";
import StatisticsExportButton from "@/components/statistics/StatisticsExportButton";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTour } from "@/hooks/useTour";
import TourProvider from "@/components/tour/TourProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import ClubSummaryStats from "@/components/statistics/ClubSummaryStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatisticsPageSkeleton } from "@/components/statistics/StatisticsSkeletons";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/types";
import type { ChallengeSettings } from "@/lib/types";
import { getInitials } from "@/lib/user-utils";

interface MemberStats {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  role: AppRole;
  ytd_distance: number;
  target: number;
  age_category: string;
}

const Statistics = () => {
  const { user } = useAuth();
  const { isMember, loading: roleLoading } = useUserRole();
  const { startTour, shouldAutoStart, isTourCompleted } = useTour();
  const [tourRunning, setTourRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [clubTotal, setClubTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleStartTour = () => {
    setTourRunning(true);
    startTour("statistics");
  };

  useEffect(() => {
    if (!loading && isMember && shouldAutoStart("statistics")) {
      const timer = setTimeout(() => handleStartTour(), 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isMember]);

  const currentYear = new Date().getFullYear();

  const getTargetForAgeCategory = (
    ageCategory: string,
    settings: ChallengeSettings
  ): number => {
    if (ageCategory === "over_60") return settings.target_over_60;
    if (ageCategory === "under_60") return settings.target_under_60;
    return settings.target_under_40;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("yearly_challenge_settings")
          .select("*")
          .eq("year", currentYear)
          .maybeSingle();

        if (settingsError) throw settingsError;

        const typedSettings = settingsData as ChallengeSettings | null;
        setSettings(typedSettings);

        const { data: memberData, error: memberError } = await supabase.rpc(
          "get_member_statistics"
        );

        if (memberError) throw memberError;

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        const memberStats: MemberStats[] = (memberData || []).map((profile: any) => {
          const role = roles?.find((r) => r.user_id === profile.id);
          const target = typedSettings
            ? getTargetForAgeCategory(profile.age_category, typedSettings)
            : 0;
          const ytd_distance = profile.strava_ytd_distance || 0;

          return {
            id: profile.id,
            full_name: profile.full_name,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            role: (role?.role as AppRole) || "member",
            ytd_distance,
            target,
            age_category: profile.age_category,
          };
        });

        memberStats.sort((a, b) => b.ytd_distance - a.ytd_distance);

        setMembers(memberStats);
        setClubTotal(memberStats.reduce((sum, m) => sum + m.ytd_distance, 0));
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Nepodařilo se načíst statistiky");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear]);

  const getAgeCategoryLabel = (ageCategory: string): string => {
    if (ageCategory === "over_60") return "Nad 60";
    if (ageCategory === "under_60") return "40–60";
    return "Pod 40";
  };

  const heroEyebrow = `Sezónní cíl klubu ${currentYear}`;

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
          <div className="max-w-5xl mx-auto space-y-16">
            <header className="text-center space-y-4">
              <span className="block text-accent text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                {heroEyebrow}
              </span>
              <h1 className="sr-only">Statistiky klubu {currentYear}</h1>
              <div className="h-20 md:h-32 bg-warm/60 rounded-sm animate-pulse" />
            </header>
            <StatisticsPageSkeleton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const clubProgress = settings?.club_total_target
    ? Math.min((clubTotal / settings.club_total_target) * 100, 100)
    : 0;
  const clubRemaining = settings?.club_total_target
    ? Math.max(settings.club_total_target - clubTotal, 0)
    : 0;
  const clubCompleted = clubProgress >= 100;

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Seo
        title="Statistiky klubu | ESKO.cc"
        description="Roční přehled najetých kilometrů, převýšení a aktivit členů cyklistického klubu ESKO.cc z Karolinky. Data ze Stravy v reálném čase."
        path="/statistiky"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="sr-only">Statistiky klubu {currentYear}</h1>

          {!isMember && !roleLoading ? (
            <div className="space-y-8">
              <header className="text-center space-y-3" data-tour="statistics-header">
                <span className="block text-accent text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                  {heroEyebrow}
                </span>
                <p className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight">
                  Statistiky klubu
                </p>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Data jsou počítána z aktivit v klubu ESKO.cc na Stravě
                </p>
              </header>
              <MemberOnlyContent
                title="Statistiky pro členy"
                description="Pro zobrazení statistik a žebříčku členů se staň členem klubu."
              />
            </div>
          ) : error ? (
            <div className="border border-destructive/30 bg-destructive/5 py-16 text-center rounded-sm">
              <AlertCircle className="w-10 h-10 mx-auto mb-4 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div className="space-y-16">
              <div className="flex justify-end -mb-8">
                <div className="flex items-center gap-1">
                  {isMember && !isTourCompleted("statistics") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartTour}
                      className="gap-2 font-display uppercase tracking-[0.18em] text-xs text-accent hover:text-foreground hover:bg-warm"
                      aria-label="Nápověda k statistikám"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Nápověda
                    </Button>
                  )}
                  <StatisticsExportButton targetRef={exportRef} year={currentYear} />
                </div>
              </div>

              <div ref={exportRef} className="space-y-16 bg-background">
                {/* HERO: Club Goal */}
                {settings && (
                  <section
                    className="text-center space-y-8 animate-fade-up"
                    data-tour="club-goal"
                    aria-labelledby="club-goal-heading"
                  >
                    <header className="space-y-3">
                      <span className="block text-accent text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                        {heroEyebrow}
                      </span>
                      <p
                        id="club-goal-heading"
                        className="font-display font-bold text-foreground tracking-tight text-6xl md:text-8xl leading-none tabular-nums"
                      >
                        {Math.round(clubProgress)}%
                      </p>
                      <p className="sr-only">
                        Klubový cíl: {clubTotal.toLocaleString()} km z{" "}
                        {settings.club_total_target.toLocaleString()} km
                      </p>
                    </header>

                    <div className="max-w-2xl mx-auto space-y-5">
                      <div
                        className="w-full h-3 bg-warm rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(clubProgress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Klubový cíl: ${Math.round(clubProgress)} %`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            clubCompleted ? "bg-success" : "bg-primary"
                          }`}
                          style={{ width: `${clubProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-left">
                          <p className="text-accent text-[10px] md:text-xs uppercase tracking-[0.18em] font-medium">
                            Aktuálně
                          </p>
                          <p className="font-display text-xl md:text-2xl font-semibold text-foreground tabular-nums">
                            {clubTotal.toLocaleString()} km
                          </p>
                        </div>
                        <div className="text-center hidden md:block">
                          {clubCompleted ? (
                            <span className="inline-flex items-center gap-1.5 text-success font-medium text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              Cíl splněn
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Zbývá {clubRemaining.toLocaleString()} km
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-accent text-[10px] md:text-xs uppercase tracking-[0.18em] font-medium">
                            Cíl
                          </p>
                          <p className="font-display text-xl md:text-2xl font-semibold text-foreground tabular-nums">
                            {settings.club_total_target.toLocaleString()} km
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Age Category Targets */}
                {settings && (
                  <section
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
                    data-tour="age-categories"
                    aria-label="Kilometrové cíle podle věkových kategorií"
                  >
                    {[
                      { label: "Pod 40 let", target: settings.target_under_40, delay: 100 },
                      { label: "40–60 let", target: settings.target_under_60, delay: 200 },
                      { label: "Nad 60 let", target: settings.target_over_60, delay: 300 },
                    ].map((cat) => (
                      <div
                        key={cat.label}
                        className="bg-warm p-6 md:p-8 rounded-sm space-y-5 animate-fade-up"
                        style={{ animationDelay: `${cat.delay}ms` }}
                      >
                        <h3 className="font-display text-sm md:text-base font-bold uppercase tracking-[0.14em] text-foreground">
                          {cat.label}
                        </h3>
                        <div className="space-y-3">
                          <p className="font-display text-3xl md:text-4xl font-bold text-foreground tabular-nums">
                            {cat.target.toLocaleString()}
                            <span className="text-base md:text-lg font-normal text-accent ml-1.5">
                              km
                            </span>
                          </p>
                          <div className="w-full h-[3px] bg-background rounded-full overflow-hidden">
                            <div className="h-full bg-secondary w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* Summary Tiles */}
                <ClubSummaryStats members={members} clubTotal={clubTotal} />

                {/* Leaderboard */}
                <section
                  className="space-y-8 animate-fade-up"
                  data-tour="leaderboard"
                  aria-labelledby="leaderboard-heading"
                >
                  <div className="flex justify-between items-baseline border-b border-warm pb-4">
                    <h2
                      id="leaderboard-heading"
                      className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight"
                    >
                      Žebříček členů
                    </h2>
                    <span className="text-accent text-[10px] md:text-xs uppercase tracking-[0.18em] font-medium">
                      YTD {currentYear}
                    </span>
                  </div>

                  {members.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                      Zatím nejsou k dispozici žádná data
                    </p>
                  ) : (
                    <ol className="space-y-px bg-warm/60 list-none">
                      {members.map((member, index) => {
                        const progress =
                          member.target > 0
                            ? Math.min((member.ytd_distance / member.target) * 100, 100)
                            : 0;
                        const isCompleted =
                          member.ytd_distance >= member.target && member.target > 0;
                        const isCurrentUser = user?.id === member.id;
                        const displayName =
                          member.full_name || member.nickname || "Bez jména";
                        const ariaLabel = `${displayName}: ${Math.round(
                          progress
                        )} % z ${member.target.toLocaleString()} km`;

                        return (
                          <li
                            key={member.id}
                            className={`bg-background py-5 md:py-6 px-4 md:px-5 flex items-center gap-4 md:gap-6 transition-colors hover:bg-warm/50 animate-fade-up ${
                              isCurrentUser ? "ring-1 ring-primary/40 ring-inset" : ""
                            }`}
                            style={{ animationDelay: `${(index + 4) * 40}ms` }}
                          >
                            <span
                              className="font-display font-bold text-base md:text-lg text-accent tabular-nums w-8 shrink-0"
                              aria-hidden="true"
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <Link
                              to={`/member/${member.id}`}
                              className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 md:flex-none md:w-64 md:shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarImage
                                  src={member.avatar_url || undefined}
                                  alt={displayName}
                                />
                                <AvatarFallback className="bg-warm text-accent text-sm font-display">
                                  {getInitials(member.full_name, member.nickname)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-display font-bold text-foreground truncate">
                                  {displayName}
                                  {isCurrentUser && (
                                    <span className="text-xs text-accent ml-1.5 font-sans font-normal">
                                      (ty)
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase tracking-[0.12em]">
                                  {getAgeCategoryLabel(member.age_category)}
                                </p>
                              </div>
                            </Link>

                            <div className="flex-1 min-w-0 hidden md:flex flex-col gap-2">
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-display font-semibold text-foreground tabular-nums">
                                  {member.ytd_distance.toLocaleString()} km
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                  / {member.target.toLocaleString()} km
                                </span>
                                <span
                                  className={`ml-auto inline-flex items-center gap-1 font-display font-semibold tabular-nums ${
                                    isCompleted ? "text-success" : "text-foreground"
                                  }`}
                                >
                                  {isCompleted && (
                                    <CheckCircle2
                                      className="w-3.5 h-3.5"
                                      aria-label="Splněno"
                                    />
                                  )}
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <div
                                className="w-full h-1 bg-warm rounded-full overflow-hidden"
                                role="progressbar"
                                aria-valuenow={Math.round(progress)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={ariaLabel}
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isCompleted ? "bg-success" : "bg-accent"
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="md:hidden flex flex-col items-end gap-1 shrink-0">
                              <span
                                className={`font-display font-semibold tabular-nums inline-flex items-center gap-1 ${
                                  isCompleted ? "text-success" : "text-foreground"
                                }`}
                              >
                                {isCompleted && (
                                  <CheckCircle2 className="w-3.5 h-3.5" aria-label="Splněno" />
                                )}
                                {Math.round(progress)}%
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {member.ytd_distance.toLocaleString()} km
                              </span>
                            </div>

                            <div className="md:hidden w-full basis-full order-last">
                              <div
                                className="w-full h-1 bg-warm rounded-full overflow-hidden mt-3"
                                role="progressbar"
                                aria-valuenow={Math.round(progress)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={ariaLabel}
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isCompleted ? "bg-success" : "bg-accent"
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>

                <div
                  data-export-only
                  className="items-center justify-between gap-3 pt-6 border-t border-warm text-[10px] uppercase tracking-[0.18em] text-accent"
                >
                  <span className="font-display font-bold">
                    ESKO.cc — Statistiky klubu {currentYear}
                  </span>
                  <span className="tabular-nums">
                    {new Date().toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <TourProvider
        tourId="statistics"
        run={tourRunning}
        onFinish={() => setTourRunning(false)}
      />
    </div>
  );
};

export default Statistics;
