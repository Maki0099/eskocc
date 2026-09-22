import Seo from "@/components/Seo";
import { useEffect, useRef, useState } from "react";
import StatisticsExportButton from "@/components/statistics/StatisticsExportButton";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTour } from "@/hooks/useTour";
import TourProvider from "@/components/tour/TourProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import ClubSummaryStats from "@/components/statistics/ClubSummaryStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatisticsPageSkeleton } from "@/components/statistics/StatisticsSkeletons";
import {
  Target,
  Trophy,
  Medal,
  Award,
  Users,
  Bike,
  Mountain,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/types";
import type { ChallengeSettings } from "@/lib/types";
import { getInitials } from "@/lib/user-utils";
import { ROUTES } from "@/lib/routes";
import StravaConnectPrompt from "@/components/strava/StravaConnectPrompt";
import WeeklyLeaderboard from "@/components/statistics/WeeklyLeaderboard";
import MonthlyLeaderboard from "@/components/statistics/MonthlyLeaderboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MemberStats {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  role: AppRole;
  ytd_distance: number;
  ytd_elevation: number;
  target: number;
  age_category: string;
  is_connected: boolean;
  needs_reauth: boolean;
  last_synced_at: string | null;
}

type SortMode = "distance" | "elevation";
type RideFilter = "all" | "trainer" | "outdoor";

const Statistics = () => {
  const { user } = useAuth();
  const { isMember, loading: roleLoading } = useUserRole();
  const { startTour, shouldAutoStart, isTourCompleted } = useTour();
  const navigate = useNavigate();
  const [tourRunning, setTourRunning] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [clubTotal, setClubTotal] = useState(0);
  const [clubElevation, setClubElevation] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("distance");
  const [error, setError] = useState<string | null>(null);
  const [rideFilter, setRideFilter] = useState<RideFilter>("all");
  const [filteredStats, setFilteredStats] = useState<Record<string, { km: number; elevation: number; rides: number }> | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_member_statistics_filtered" as any, {
        _mode: rideFilter,
      });
      if (!active) return;
      const map: Record<string, { km: number; elevation: number; rides: number }> = {};
      (data as any[] || []).forEach((row) => {
        map[row.user_id] = { km: Number(row.km), elevation: Number(row.elevation), rides: Number(row.rides) };
      });
      setFilteredStats(map);
    };
    load();
    return () => {
      active = false;
    };
  }, [rideFilter]);

  const handleStartTour = () => {
    setTourRunning(true);
    startTour("statistics");
  };

  useEffect(() => {
    if (!loading && isMember && shouldAutoStart("statistics")) {
      const timer = setTimeout(() => handleStartTour(), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isMember]);

  const currentYear = new Date().getFullYear();

  const getTargetForAgeCategory = (ageCategory: string, settings: ChallengeSettings): number => {
    if (ageCategory === 'over_60') return settings.target_over_60;
    if (ageCategory === 'under_60') return settings.target_under_60;
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

        const { data: memberData, error: memberError } = await supabase
          .rpc("get_member_statistics");

        if (memberError) throw memberError;

        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        const memberStats: MemberStats[] = (memberData || []).map((profile: any) => {
          const role = roles?.find((r) => r.user_id === profile.id);
          const target = typedSettings ? getTargetForAgeCategory(profile.age_category, typedSettings) : 0;
          const ytd_distance = profile.strava_ytd_distance || 0;

          return {
            id: profile.id,
            full_name: profile.full_name,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            role: (role?.role as AppRole) || "member",
            ytd_distance,
            ytd_elevation: profile.strava_ytd_elevation || 0,
            target,
            age_category: profile.age_category,
            is_connected: profile.is_connected ?? false,
            needs_reauth: profile.needs_reauth ?? false,
            last_synced_at: profile.last_synced_at ?? null,
          };
        });

        memberStats.sort((a, b) => b.ytd_distance - a.ytd_distance);

        setMembers(memberStats);
        setClubTotal(memberStats.reduce((sum, m) => sum + m.ytd_distance, 0));
        setClubElevation(memberStats.reduce((sum, m) => sum + m.ytd_elevation, 0));
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Nepodařilo se načíst statistiky");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentYear]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
        );
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Medal className="w-4 h-4 text-muted-foreground" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
          </div>
        );
    }
  };

  const getAgeCategoryLabel = (ageCategory: string): string => {
    if (ageCategory === 'over_60') return "Nad 60";
    if (ageCategory === 'under_60') return "40–60";
    return "Pod 40";
  };

  const startOfYear = new Date(currentYear, 0, 1);
  const dayOfYear = Math.max(1, Math.floor((Date.now() - startOfYear.getTime()) / 86400000) + 1);
  const daysInYear = new Date(currentYear, 11, 31).getDate() === 31
    ? (new Date(currentYear, 1, 29).getMonth() === 1 ? 366 : 365)
    : 365;

  const getDisplayDistance = (m: MemberStats) =>
    filteredStats && m.is_connected ? (filteredStats[m.id]?.km ?? 0) : m.ytd_distance;
  const getDisplayElevation = (m: MemberStats) =>
    filteredStats && m.is_connected ? (filteredStats[m.id]?.elevation ?? 0) : m.ytd_elevation;

  const getPaceInfo = (m: MemberStats) => {
    if (m.target <= 0) return null;
    const distance = getDisplayDistance(m);
    const expected = (m.target * dayOfYear) / daysInYear;
    const diff = distance - expected;
    if (distance >= m.target) return { label: "Cíl splněn", done: true, ahead: true };
    return {
      label: diff >= 0
        ? `Napřed o ${Math.round(diff).toLocaleString("cs-CZ")} km`
        : `Pozadu o ${Math.round(-diff).toLocaleString("cs-CZ")} km`,
      done: false,
      ahead: diff >= 0,
    };
  };

  const connectedCount = members.filter((m) => m.is_connected).length;

  const sortedMembers = members
    .filter((m) => rideFilter === "all" || m.is_connected)
    .sort((a, b) =>
      sortMode === "elevation"
        ? getDisplayElevation(b) - getDisplayElevation(a)
        : getDisplayDistance(b) - getDisplayDistance(a)
    );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Výzva {currentYear}</span>
              </div>
              <h1 className="text-display font-bold">Statistiky klubu</h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Sleduj pokrok členů a celého klubu ve splnění ročního cíle
              </p>
            </div>
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
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Statistiky klubu | ESKO.cc"
        description="Roční přehled najetých kilometrů, převýšení a aktivit členů cyklistického klubu ESKO.cc z Karolinky. Data ze Stravy v reálném čase."
        path="/statistiky"
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2" data-tour="statistics-header">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Výzva {currentYear}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-display font-bold">Statistiky klubu</h1>
              {isMember && !isTourCompleted("statistics") && (
                <Button variant="ghost" size="icon" onClick={handleStartTour} className="shrink-0" aria-label="Nápověda k statistikám">
                  <HelpCircle className="w-5 h-5" />
                </Button>
              )}
            </div>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Data jsou počítána z aktivit v klubu ESKO.cc na Stravě
            </p>
          </div>

          {!isMember && !roleLoading ? (
            <MemberOnlyContent
              title="Statistiky pro členy"
              description="Pro zobrazení statistik a žebříčku členů se staň členem klubu."
            />
          ) : error ? (
            <Card className="border-destructive/20">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <StravaConnectPrompt />
              <div className="flex justify-end">
                <StatisticsExportButton targetRef={exportRef} year={currentYear} />
              </div>
              <div ref={exportRef} className="space-y-6 bg-background">
              {settings && (
                <Card className="overflow-hidden border-0 shadow-lg animate-fade-up" data-tour="club-goal">
                  <div className="bg-gradient-to-br from-accent to-secondary p-6 md:p-8 text-accent-foreground">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-accent-foreground/20 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">Klubový cíl</h2>
                        <p className="text-accent-foreground/80 text-sm">Společně za {settings.club_total_target.toLocaleString()} km</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-4xl md:text-5xl font-bold tracking-tight">
                          {clubTotal.toLocaleString()}
                          <span className="text-lg font-normal ml-1 opacity-80">km</span>
                        </span>
                        <span className="text-lg opacity-80">
                          z {settings.club_total_target.toLocaleString()} km
                        </span>
                      </div>

                      <div className="h-3 bg-accent-foreground/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            clubCompleted ? 'bg-green-400' : 'bg-accent-foreground'
                          }`}
                          style={{ width: `${clubProgress}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          {clubCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Cíl splněn!
                            </>
                          ) : (
                            <>{Math.round(clubProgress)}% splněno</>
                          )}
                        </span>
                        <span className="opacity-80">
                          Zbývá {clubRemaining.toLocaleString()} km
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {settings && (
                <div className="grid gap-4 md:grid-cols-3" data-tour="age-categories">
                  <Card className="text-center animate-fade-up animation-delay-100">
                    <CardContent className="pt-6 pb-5">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Bike className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Pod 40 let</p>
                      <p className="text-2xl font-bold">{settings.target_under_40.toLocaleString()} km</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center animate-fade-up animation-delay-200">
                    <CardContent className="pt-6 pb-5">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                        <Bike className="w-5 h-5 text-secondary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">40–60 let</p>
                      <p className="text-2xl font-bold">{settings.target_under_60.toLocaleString()} km</p>
                    </CardContent>
                  </Card>
                  <Card className="text-center animate-fade-up animation-delay-300">
                    <CardContent className="pt-6 pb-5">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                        <Bike className="w-5 h-5 text-accent" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Nad 60 let</p>
                      <p className="text-2xl font-bold">{settings.target_over_60.toLocaleString()} km</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <ClubSummaryStats members={members} clubTotal={clubTotal} clubElevation={clubElevation} />

              <WeeklyLeaderboard />
              <MonthlyLeaderboard />

              <div className="flex flex-wrap justify-center gap-3" data-export-ignore="true">
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to={ROUTES.CLUB_MAP}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Mapa klubu — kde jezdíme
                  </Link>
                </Button>
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link to={ROUTES.CLUB_RECORDS}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Rekordy klubu
                  </Link>
                </Button>
              </div>

              <Card className="animate-fade-up animation-delay-400" data-tour="leaderboard">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="w-5 h-5 text-primary" />
                      Pořadí členů
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2" data-export-ignore="true">
                      <div className="inline-flex rounded-lg bg-muted p-0.5">
                        <button
                          type="button"
                          onClick={() => setSortMode("distance")}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sortMode === "distance" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          Kilometry
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortMode("elevation")}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sortMode === "elevation" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          Převýšení
                        </button>
                      </div>
                      <div className="inline-flex rounded-lg bg-muted p-0.5">
                        {([
                          ["all", "Vše"],
                          ["trainer", "Trenažér"],
                          ["outdoor", "Venku"],
                        ] as [RideFilter, string][]).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRideFilter(value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              rideFilter === value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Počítají se jen jízdy na kole · „Trenažér" zahrnuje i virtuální jízdy (Zwift)
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {sortedMembers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Zatím nejsou k dispozici žádná data
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sortedMembers.map((member, index) => {
                        const displayDistance = getDisplayDistance(member);
                        const displayElevation = getDisplayElevation(member);
                        const pace = getPaceInfo(member);
                        const rawPercentage = member.target > 0
                          ? Math.round((displayDistance / member.target) * 100)
                          : 0;
                        const progress = Math.min(rawPercentage, 100);
                        const isCompleted = displayDistance >= member.target && member.target > 0;
                        const isCurrentUser = user?.id === member.id;

                        return (
                          <div
                            key={member.id}
                            className={`p-3 md:p-4 rounded-xl transition-all animate-fade-up ${
                              isCurrentUser ? "bg-primary/10 ring-1 ring-primary/20" : "bg-card hover:bg-muted/50"
                            }`}
                            style={{ animationDelay: `${(index + 5) * 50}ms` }}
                          >
                            <div className="flex items-center gap-2.5 md:gap-4">
                              <div className="flex-shrink-0">{getRankIcon(index)}</div>

                              <Link
                                to={`/member/${member.id}`}
                                className="flex items-center gap-2.5 min-w-0 flex-1 md:flex-none md:w-56 md:shrink-0 md:basis-56 hover:opacity-80 transition-opacity"
                              >
                                <Avatar className="w-10 h-10 border-2 border-background shadow-sm shrink-0">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                    {getInitials(member.full_name, member.nickname)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm md:text-base truncate leading-tight">
                                    {member.full_name || "Bez jména"}
                                    {isCurrentUser && (
                                      <span className="text-xs text-muted-foreground ml-1.5">(ty)</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                                    {getAgeCategoryLabel(member.age_category)}
                                    <span className="md:hidden inline-flex items-center gap-0.5 ml-1.5">
                                      <Mountain className="w-3 h-3" />
                                      {Math.round(displayElevation).toLocaleString("cs-CZ")} m
                                    </span>
                                  </p>
                                  {member.needs_reauth ? (
                                    isCurrentUser ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(ROUTES.ACCOUNT);
                                        }}
                                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        Propojení vypršelo – obnovit
                                      </button>
                                    ) : (
                                      <span
                                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"
                                        title={member.last_synced_at ? `Poslední sync: ${new Date(member.last_synced_at).toLocaleString("cs-CZ")}` : "Propojení vyžaduje obnovení"}
                                      >
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        Vypršelo
                                      </span>
                                    )
                                  ) : !member.is_connected ? (
                                    isCurrentUser ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(ROUTES.ACCOUNT);
                                        }}
                                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline"
                                      >
                                        <AlertCircle className="w-3 h-3" />
                                        Propojit Stravu
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setHowToOpen(true);
                                        }}
                                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline text-left"
                                      >
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                        Nepropojená Strava — jak propojit?
                                      </button>
                                    )
                                  ) : !isCurrentUser ? (
                                    <span
                                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400"
                                      title={member.last_synced_at ? `Poslední sync: ${new Date(member.last_synced_at).toLocaleString("cs-CZ")}` : "Propojeno se Stravou"}
                                    >
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      Propojeno
                                    </span>
                                  ) : null}
                                </div>
                              </Link>

                              <div className="flex-1 min-w-0 hidden md:block">
                                <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
                                  <span className="font-semibold">
                                    {Math.round(displayDistance).toLocaleString()} km
                                  </span>
                                  <span className="text-muted-foreground">
                                    / {member.target.toLocaleString()} km
                                  </span>
                                  <span className="text-muted-foreground inline-flex items-center gap-1 whitespace-nowrap">
                                    <Mountain className="w-3.5 h-3.5" />
                                    {Math.round(displayElevation).toLocaleString("cs-CZ")} m
                                  </span>
                                  {filteredStats && member.is_connected && (
                                    <span className="text-muted-foreground whitespace-nowrap">
                                      {filteredStats[member.id]?.rides ?? 0} jízd
                                    </span>
                                  )}
                                  <span
                                    className={`ml-auto font-medium inline-flex items-center gap-1 ${
                                      isCompleted ? "text-green-600 dark:text-green-400" : ""
                                    }`}
                                  >
                                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {rawPercentage}%
                                  </span>
                                </div>
                                <Progress
                                  value={progress}
                                  className={`h-3 bg-muted border border-border/60 ${isCompleted ? '[&>div]:bg-green-600' : '[&>div]:bg-primary'}`}
                                />
                                {pace && (
                                  <p className={`mt-1.5 text-[11px] font-medium ${
                                    pace.done || pace.ahead
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}>
                                    {pace.label}
                                  </p>
                                )}
                              </div>

                              <div className="flex-shrink-0 text-right md:hidden whitespace-nowrap">
                                {isCompleted ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-0 whitespace-nowrap">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      {rawPercentage}%
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                      {Math.round(displayDistance).toLocaleString()} km
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm font-semibold leading-tight whitespace-nowrap">
                                      {rawPercentage}%
                                    </div>
                                    <div className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                                      {Math.round(displayDistance).toLocaleString()} km
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 md:hidden">
                              <Progress
                                value={progress}
                                className={`h-2 bg-muted border border-border/60 ${isCompleted ? '[&>div]:bg-green-600' : '[&>div]:bg-primary'}`}
                              />
                            </div>

                            {pace && (
                              <p className={`mt-2 text-[11px] font-medium md:hidden ${
                                pace.done
                                  ? "text-green-600 dark:text-green-400"
                                  : pace.ahead
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-amber-600 dark:text-amber-400"
                              }`}>
                                {pace.label}
                              </p>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                  {rideFilter !== "all" ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Zobrazeni jen členové s vlastním propojením Stravy ({connectedCount} z {members.length}).
                      U ostatních nelze trenažér a venkovní jízdy rozlišit — propojením Stravy se to změní.
                    </p>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      U členů s vlastním propojením Stravy ({connectedCount} z {members.length}) se počítají jen jízdy na kole.
                      U ostatních jde o starší klubová data bez rozlišení sportu.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div
                data-export-only
                className="items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground"
              >
                <span className="font-semibold">ESKO.cc — Statistiky klubu {currentYear}</span>
                <span>{new Date().toLocaleDateString("cs-CZ")}</span>
              </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <TourProvider tourId="statistics" run={tourRunning} onFinish={() => setTourRunning(false)} />

      <Dialog open={howToOpen} onOpenChange={setHowToOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Jak propojit Stravu</DialogTitle>
            <DialogDescription>
              Propojení si musí provést každý člen sám ze svého účtu — za někoho jiného to nejde.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-5">
            <li>Přihlaš se do svého účtu na ESKO.cc.</li>
            <li>Otevři <span className="font-medium text-foreground">Nastavení účtu</span>.</li>
            <li>
              Klikni na <span className="font-medium text-foreground">Propojit Stravu</span> a potvrď
              přístup ve Stravě.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Bez propojení se kilometry ani převýšení do klubových statistik nepočítají.
          </p>
          <Button
            className="rounded-xl"
            onClick={() => {
              setHowToOpen(false);
              navigate(ROUTES.ACCOUNT);
            }}
          >
            Otevřít nastavení účtu
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Statistics;
