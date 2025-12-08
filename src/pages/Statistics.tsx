import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Target, 
  Trophy, 
  Medal, 
  Award,
  Loader2,
  Users,
  TrendingUp,
  AlertCircle
} from "lucide-react";

type AppRole = "pending" | "member" | "active_member" | "admin";

interface ChallengeSettings {
  year: number;
  target_under_40: number;
  target_under_60: number;
  target_over_60: number;
  club_total_target: number;
}

interface MemberStats {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  strava_id: string | null;
  role: AppRole;
  ytd_distance: number;
  target: number;
  age: number | null;
}

const Statistics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ChallengeSettings | null>(null);
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [clubTotal, setClubTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getTargetForAge = (age: number | null, settings: ChallengeSettings): number => {
    if (age === null) return settings.target_under_40;
    if (age >= 60) return settings.target_over_60;
    if (age >= 40) return settings.target_under_60;
    return settings.target_under_40;
  };

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

        // Fetch all approved members (not pending)
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, nickname, avatar_url, birth_date, strava_id");

        if (profilesError) throw profilesError;

        // Fetch roles
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        // Filter to only approved members
        const approvedProfiles = (profiles || []).filter((profile) => {
          const role = roles?.find((r) => r.user_id === profile.id);
          return role && role.role !== "pending";
        });

        // Fetch Strava stats for each member with Strava connected
        const memberStatsPromises = approvedProfiles.map(async (profile) => {
          const role = roles?.find((r) => r.user_id === profile.id);
          const age = calculateAge(profile.birth_date);
          const target = typedSettings ? getTargetForAge(age, typedSettings) : 0;

          let ytd_distance = 0;
          if (profile.strava_id) {
            try {
              const { data: statsData } = await supabase.functions.invoke(
                "strava-stats",
                { body: { userId: profile.id } }
              );
              if (statsData?.ytd_ride_totals?.distance) {
                ytd_distance = Math.round(statsData.ytd_ride_totals.distance / 1000);
              }
            } catch (err) {
              console.error(`Error fetching stats for ${profile.id}:`, err);
            }
          }

          return {
            id: profile.id,
            full_name: profile.full_name,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            birth_date: profile.birth_date,
            strava_id: profile.strava_id,
            role: (role?.role as AppRole) || "member",
            ytd_distance,
            target,
            age,
          };
        });

        const memberStats = await Promise.all(memberStatsPromises);
        
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

  const getInitials = (name: string | null, nickname: string | null) => {
    const displayName = nickname || name;
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "?";
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">{index + 1}</span>;
    }
  };

  const getAgeCategory = (age: number | null): string => {
    if (age === null) return "Pod 40";
    if (age >= 60) return "Nad 60";
    if (age >= 40) return "40-60";
    return "Pod 40";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-8">
            <Target className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Statistiky klubu</h1>
              <p className="text-muted-foreground">Výzva roku {currentYear}</p>
            </div>
          </div>

          {error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Club Goal Card */}
              {settings && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Klubový cíl {currentYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-lg">
                      <span className="font-semibold">
                        {clubTotal.toLocaleString()} km
                      </span>
                      <span className="text-muted-foreground">
                        / {settings.club_total_target.toLocaleString()} km
                      </span>
                    </div>
                    <Progress 
                      value={clubProgress} 
                      className={`h-4 ${clubProgress >= 100 ? '[&>div]:bg-green-500' : ''}`}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{Math.round(clubProgress)}% splněno</span>
                      <span>Zbývá: {clubRemaining.toLocaleString()} km</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Age Category Targets */}
              {settings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Cíle podle věkových kategorií
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Pod 40 let</p>
                        <p className="text-2xl font-bold">{settings.target_under_40.toLocaleString()} km</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">40-60 let</p>
                        <p className="text-2xl font-bold">{settings.target_under_60.toLocaleString()} km</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Nad 60 let</p>
                        <p className="text-2xl font-bold">{settings.target_over_60.toLocaleString()} km</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Pořadí členů
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Zatím nejsou k dispozici žádná data
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member, index) => {
                        const progress = member.target > 0 
                          ? Math.min((member.ytd_distance / member.target) * 100, 100) 
                          : 0;
                        const isCompleted = member.ytd_distance >= member.target;
                        const isCurrentUser = user?.id === member.id;

                        return (
                          <div 
                            key={member.id}
                            className={`p-4 rounded-xl border transition-colors ${
                              isCurrentUser 
                                ? "border-primary/30 bg-primary/5" 
                                : "border-border/50 hover:border-border"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Rank */}
                              <div className="flex-shrink-0 w-8 flex justify-center">
                                {getRankIcon(index)}
                              </div>

                              {/* Avatar & Name */}
                              <Link 
                                to={`/member/${member.id}`}
                                className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
                              >
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {getInitials(member.full_name, member.nickname)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {member.nickname || member.full_name || "Bez jména"}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {getAgeCategory(member.age)}
                                    </span>
                                    {!member.strava_id && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                                        Bez Stravy
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Link>

                              {/* Progress */}
                              <div className="flex-1 ml-4">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium">
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
                              <div className="flex-shrink-0 w-16 text-right">
                                {isCompleted ? (
                                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20">
                                    ✓ {Math.round(progress)}%
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {Math.round(progress)}%
                                  </span>
                                )}
                              </div>
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
