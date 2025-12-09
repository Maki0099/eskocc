import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import StravaClubBanner from "@/components/strava/StravaClubBanner";
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
  AlertCircle,
  CheckCircle2,
  Check
} from "lucide-react";
import type { AppRole } from "@/lib/types";
import type { ChallengeSettings } from "@/lib/types";
import { getInitials } from "@/lib/user-utils";

interface MemberStats {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  strava_id: string | null;
  role: AppRole;
  ytd_distance: number;
  target: number;
  age_category: string;
  is_strava_club_member: boolean;
}

const Statistics = () => {
  const { user } = useAuth();
  const { isMember, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [clubTotal, setClubTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userStravaId, setUserStravaId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const getTargetForAgeCategory = (ageCategory: string, settings: ChallengeSettings): number => {
    if (ageCategory === 'over_60') return settings.target_over_60;
    if (ageCategory === 'under_60') return settings.target_under_60;
    return settings.target_under_40;
  };

  // Fetch current user's strava_id
  useEffect(() => {
    const fetchUserStrava = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("strava_id")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.strava_id) {
        setUserStravaId(data.strava_id);
      }
    };
    fetchUserStrava();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch challenge settings for current year
        const { data: settingsData, error: settingsError } = await supabase
          .from("yearly_challenge_settings")
          .select("*")
          .eq("year", currentYear)
          .maybeSingle();

        if (settingsError) throw settingsError;

        const typedSettings = settingsData as ChallengeSettings | null;
        setSettings(typedSettings);

        // Fetch member statistics using secure RPC function (no birth_date exposed)
        const { data: memberData, error: memberError } = await supabase
          .rpc("get_member_statistics");

        if (memberError) throw memberError;

        // Fetch roles for members
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        // Get all user IDs for batch Strava stats request
        const userIds = (memberData || []).map((p: any) => p.id);

        // Fetch Strava stats in one batch request
        let statsMap: Record<string, { ytd_distance: number; ytd_count: number }> = {};
        
        if (userIds.length > 0) {
          try {
            const { data: batchData, error: batchError } = await supabase.functions.invoke(
              "strava-stats-batch",
              { body: { userIds } }
            );
            
            if (batchError) {
              console.error("Batch stats error:", batchError);
            } else if (batchData?.stats) {
              statsMap = batchData.stats;
            }
          } catch (err) {
            console.error("Error fetching batch stats:", err);
          }
        }

        // Build member stats with the batch results
        const memberStats: MemberStats[] = (memberData || []).map((profile: any) => {
          const role = roles?.find((r) => r.user_id === profile.id);
          const target = typedSettings ? getTargetForAgeCategory(profile.age_category, typedSettings) : 0;
          const ytd_distance = statsMap[profile.id]?.ytd_distance || profile.strava_ytd_distance || 0;

          return {
            id: profile.id,
            full_name: profile.full_name,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            strava_id: profile.strava_id,
            role: (role?.role as AppRole) || "member",
            ytd_distance,
            target,
            age_category: profile.age_category,
            is_strava_club_member: profile.is_strava_club_member || false,
          };
        });

        // Sort by distance (descending)
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
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
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
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
              {/* Strava Club Banner */}
              <StravaClubBanner hasStravaConnected={!!userStravaId} />
              {/* Club Goal Card */}
              {settings && (
                <Card className="overflow-hidden border-0 shadow-lg animate-fade-up">
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
                            clubCompleted 
                              ? 'bg-green-400' 
                              : 'bg-accent-foreground'
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

              {/* Age Category Targets */}
              {settings && (
                <div className="grid gap-4 md:grid-cols-3">
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

              {/* Leaderboard */}
              <Card className="animate-fade-up animation-delay-400">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="w-5 h-5 text-primary" />
                    Pořadí členů
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {members.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Zatím nejsou k dispozici žádná data
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member, index) => {
                        const progress = member.target > 0 
                          ? Math.min((member.ytd_distance / member.target) * 100, 100) 
                          : 0;
                        const isCompleted = member.ytd_distance >= member.target && member.target > 0;
                        const isCurrentUser = user?.id === member.id;

                        return (
                          <div 
                            key={member.id}
                            className={`p-3 md:p-4 rounded-xl transition-all animate-fade-up ${
                              isCurrentUser 
                                ? "bg-primary/10 ring-1 ring-primary/20" 
                                : "bg-card hover:bg-muted/50"
                            }`}
                            style={{ animationDelay: `${(index + 5) * 50}ms` }}
                          >
                            <div className="flex items-center gap-3 md:gap-4">
                              {/* Rank */}
                              <div className="flex-shrink-0">
                                {getRankIcon(index)}
                              </div>

                              {/* Avatar & Name */}
                              <Link 
                                to={`/member/${member.id}`}
                                className="flex items-center gap-3 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity"
                              >
                                <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                    {getInitials(member.full_name, member.nickname)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {member.nickname || member.full_name || "Bez jména"}
                                    {isCurrentUser && (
                                      <span className="text-xs text-muted-foreground ml-1.5">(ty)</span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{getAgeCategoryLabel(member.age_category)}</span>
                                    {member.is_strava_club_member && (
                                      <span className="inline-flex items-center gap-0.5 text-primary">
                                        <Check className="w-3 h-3" />
                                        <span className="text-[10px]">Klub</span>
                                      </span>
                                    )}
                                    {!member.strava_id && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                        Bez Stravy
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Link>

                              {/* Progress - Desktop */}
                              <div className="flex-1 hidden md:block ml-4">
                                <div className="flex justify-between text-sm mb-1.5">
                                  <span className="font-semibold">
                                    {member.ytd_distance.toLocaleString()} km
                                  </span>
                                  <span className="text-muted-foreground">
                                    / {member.target.toLocaleString()} km
                                  </span>
                                </div>
                                <Progress 
                                  value={progress} 
                                  className={`h-2 ${isCompleted ? '[&>div]:bg-green-500' : ''}`}
                                />
                              </div>

                              {/* Status */}
                              <div className="flex-shrink-0 text-right ml-auto">
                                {isCompleted ? (
                                  <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-0">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {Math.round(progress)}%
                                  </Badge>
                                ) : (
                                  <div className="text-right">
                                    <span className="text-sm font-medium">{Math.round(progress)}%</span>
                                    <p className="text-xs text-muted-foreground md:hidden">
                                      {member.ytd_distance.toLocaleString()} km
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Progress - Mobile */}
                            <div className="mt-3 md:hidden">
                              <Progress 
                                value={progress} 
                                className={`h-1.5 ${isCompleted ? '[&>div]:bg-green-500' : ''}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Statistics;