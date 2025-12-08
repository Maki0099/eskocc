import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Users, 
  Lock,
  ArrowRight,
  Bike,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TopMember {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  ytd_distance: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  location: string;
  participant_count: number;
}

interface ClubStats {
  totalDistance: number;
  targetDistance: number;
  memberCount: number;
}

const TeaserSection = () => {
  const { user } = useAuth();
  const { isMember, role } = useUserRole();
  const [topMembers, setTopMembers] = useState<TopMember[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [clubStats, setClubStats] = useState<ClubStats | null>(null);
  const [loading, setLoading] = useState(true);

  const { ref: sectionRef, isVisible: sectionVisible } = useScrollAnimation();
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();
  const { ref: eventsRef, isVisible: eventsVisible } = useScrollAnimation();

  const isPending = role === "pending";
  // Show teaser for non-members AND pending users
  const shouldShowTeaser = !isMember;

  useEffect(() => {
    const fetchTeaserData = async () => {
      try {
        // Fetch club challenge settings
        const currentYear = new Date().getFullYear();
        const { data: settings } = await supabase
          .from("yearly_challenge_settings")
          .select("club_total_target")
          .eq("year", currentYear)
          .maybeSingle();

        // Fetch approved member count
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .neq("role", "pending");

        const memberCount = roles?.length || 0;

        // Fetch profiles with Strava data for top 3
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, nickname, avatar_url, strava_ytd_distance")
          .order("strava_ytd_distance", { ascending: false, nullsFirst: false })
          .limit(10);

        // Filter to only approved members and take top 3
        const approvedIds = new Set(roles?.map(r => r.user_id) || []);
        const topThree = (profiles || [])
          .filter(p => approvedIds.has(p.id) && p.strava_ytd_distance && p.strava_ytd_distance > 0)
          .slice(0, 3)
          .map(p => ({
            id: p.id,
            full_name: p.full_name,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
            ytd_distance: p.strava_ytd_distance || 0,
          }));

        setTopMembers(topThree);

        // Calculate total distance
        const totalDistance = (profiles || [])
          .filter(p => approvedIds.has(p.id))
          .reduce((sum, p) => sum + (p.strava_ytd_distance || 0), 0);

        setClubStats({
          totalDistance,
          targetDistance: settings?.club_total_target || 70000,
          memberCount,
        });

        // Fetch upcoming events (limited info)
        const { data: events } = await supabase
          .from("events")
          .select("id, title, event_date, location")
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(3);

        // Get participant counts
        const eventsWithCounts = await Promise.all(
          (events || []).map(async (event) => {
            const { count } = await supabase
              .from("event_participants")
              .select("*", { count: "exact", head: true })
              .eq("event_id", event.id)
              .eq("status", "going");

            return {
              ...event,
              participant_count: count || 0,
            };
          })
        );

        setUpcomingEvents(eventsWithCounts);
      } catch (error) {
        console.error("Error fetching teaser data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeaserData();
  }, []);

  // Don't render for members
  if (!shouldShowTeaser) return null;

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

  const progress = clubStats 
    ? Math.min((clubStats.totalDistance / clubStats.targetDistance) * 100, 100) 
    : 0;

  return (
    <section className="py-24 relative overflow-hidden bg-muted/30">
      {/* Subtle background */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="container mx-auto relative z-10 px-4">
        <div 
          ref={sectionRef}
          className={`text-center mb-12 animate-on-scroll fade-up ${sectionVisible ? 'is-visible' : ''}`}
        >
          <Badge variant="secondary" className="mb-4">
            <Lock className="w-3 h-3 mr-1.5" />
            Náhled pro členy
          </Badge>
          <h2 className="text-display font-semibold mb-4">
            Co se děje v klubu
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Podívej se na aktuální dění v klubu Eskocc. Pro plný přístup se staň členem.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Statistics Teaser */}
          <div 
            ref={statsRef}
            className={`animate-on-scroll fade-up ${statsVisible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '100ms' }}
          >
            <Card className="h-full overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Klubová výzva 2025</h3>
                    <p className="text-sm text-muted-foreground">Společný cíl</p>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-3/4" />
                    <div className="space-y-3 mt-6">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div className="mb-6">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-3xl font-bold">
                          {clubStats?.totalDistance.toLocaleString()}
                          <span className="text-base font-normal text-muted-foreground ml-1">km</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          z {clubStats?.targetDistance.toLocaleString()} km
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {Math.round(progress)}% splněno • {clubStats?.memberCount} aktivních členů
                      </p>
                    </div>

                    {/* Top 3 blurred */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Top jezdci</p>
                      {topMembers.length > 0 ? (
                        topMembers.map((member, index) => (
                          <div 
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <span className="text-sm font-bold text-muted-foreground w-5">
                              {index + 1}.
                            </span>
                            <Avatar className="w-8 h-8 blur-[2px]">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.full_name, member.nickname)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm blur-[3px] select-none">
                                {member.nickname || member.full_name || "Člen klubu"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <Bike className="w-4 h-4 text-muted-foreground" />
                              {Math.round(member.ytd_distance).toLocaleString()} km
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Zatím žádná data
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <Link to="/register">
                      Zobrazit celé statistiky
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events Teaser */}
          <div 
            ref={eventsRef}
            className={`animate-on-scroll fade-up ${eventsVisible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '200ms' }}
          >
            <Card className="h-full overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Nadcházející vyjížďky</h3>
                    <p className="text-sm text-muted-foreground">Přidej se k nám</p>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map((event, index) => (
                      <div 
                        key={event.id}
                        className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-medium line-clamp-1">{event.title}</h4>
                          <Badge variant="secondary" className="shrink-0">
                            <Users className="w-3 h-3 mr-1" />
                            {event.participant_count}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(event.event_date), "d. MMMM", { locale: cs })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Žádné nadcházející vyjížďky
                    </p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-border/50">
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <Link to="/register">
                      Přihlásit se na vyjížďky
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div 
          className={`text-center mt-12 animate-on-scroll fade-up ${sectionVisible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '300ms' }}
        >
          {isPending ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Čekáte na schválení členství</span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Vaše registrace byla přijata! Jakmile administrátor schválí vaše členství, 
                získáte plný přístup ke statistikám, vyjížďkám a galerii.
              </p>
              <Button size="lg" variant="outline" asChild>
                <Link to="/dashboard">
                  Přejít na dashboard
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                Chceš vidět kompletní statistiky a účastnit se vyjížděk?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Staň se členem
                  </Link>
                </Button>
                {!user && (
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/login">
                      Už mám účet
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default TeaserSection;
