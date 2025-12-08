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
  Clock,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { getInitials } from "@/lib/user-utils";

interface TopMember {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  ytd_distance: number;
}

interface AnonymizedRider {
  initials: string;
  distance: number;
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
  topRiders: AnonymizedRider[];
}

type ViewVariant = "anonymous" | "pending" | "member";

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
  
  // Determine view variant
  const getVariant = (): ViewVariant => {
    if (isMember) return "member";
    if (isPending) return "pending";
    return "anonymous";
  };
  
  const variant = getVariant();

  useEffect(() => {
    const fetchTeaserData = async () => {
      try {
        // Use RPC function to get club stats (works for all users)
        const { data: stats, error: statsError } = await supabase.rpc('get_club_teaser_stats');
        
        if (statsError) {
          console.error("Error fetching club stats:", statsError);
        } else if (stats) {
          const parsedStats = stats as unknown as { 
            total_distance: number; 
            target_distance: number; 
            member_count: number;
            top_riders: AnonymizedRider[];
          };
          setClubStats({
            totalDistance: parsedStats.total_distance || 0,
            targetDistance: parsedStats.target_distance || 70000,
            memberCount: parsedStats.member_count || 0,
            topRiders: parsedStats.top_riders || [],
          });
        }

        // For members, fetch full top member data
        if (isMember) {
          const { data: fullMembers, error: membersError } = await supabase.rpc('get_top_members', { limit_count: 3 });
          
          if (membersError) {
            console.error("Error fetching top members:", membersError);
          } else if (fullMembers) {
            setTopMembers(fullMembers as unknown as TopMember[]);
          }
        }

        // Fetch upcoming events
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
  }, [isMember]);


  const progress = clubStats 
    ? Math.min((clubStats.totalDistance / clubStats.targetDistance) * 100, 100) 
    : 0;

  const getSectionTitle = () => {
    if (variant === "member") return "Aktivita klubu";
    return "Co se děje v klubu";
  };

  const getSectionDescription = () => {
    switch (variant) {
      case "member":
        return "Přehled aktuálního dění v klubu Eskocc.";
      case "pending":
        return "Podívej se na aktuální dění v klubu. Po schválení členství uvidíš plné detaily.";
      default:
        return "Podívej se na aktuální dění v klubu Eskocc. Pro plný přístup se staň členem.";
    }
  };

  const getBadgeContent = () => {
    switch (variant) {
      case "member":
        return { icon: Eye, text: "Přehled klubu" };
      case "pending":
        return { icon: Clock, text: "Čekání na schválení" };
      default:
        return { icon: Lock, text: "Náhled pro členy" };
    }
  };

  const badgeContent = getBadgeContent();

  // Render top riders based on variant
  const renderTopRiders = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    // For members - show full data with links
    if (variant === "member" && topMembers.length > 0) {
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Top jezdci</p>
          {topMembers.map((member, index) => (
            <Link
              key={member.id}
              to={`/member/${member.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-sm font-bold text-muted-foreground w-5">
                {index + 1}.
              </span>
              <Avatar className="w-8 h-8">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.full_name, member.nickname)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {member.nickname || member.full_name || "Člen klubu"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Bike className="w-4 h-4 text-muted-foreground" />
                {Math.round(member.ytd_distance).toLocaleString()} km
              </div>
            </Link>
          ))}
        </div>
      );
    }

    // For non-members - show anonymized data with blur effect
    if (clubStats?.topRiders && clubStats.topRiders.length > 0) {
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Top jezdci</p>
          {clubStats.topRiders.map((rider, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <span className="text-sm font-bold text-muted-foreground w-5">
                {index + 1}.
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-primary blur-[2px]">
                  {rider.initials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-muted-foreground blur-[3px] select-none">
                  Jméno člena
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Bike className="w-4 h-4 text-muted-foreground" />
                {Math.round(rider.distance).toLocaleString()} km
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Top jezdci</p>
        <p className="text-sm text-muted-foreground text-center py-4">
          Zatím žádná data
        </p>
      </div>
    );
  };

  // Render events based on variant
  const renderEvents = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }

    if (upcomingEvents.length === 0) {
      return (
        <div className="py-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Žádné nadcházející vyjížďky
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {upcomingEvents.map((event) => {
          const eventContent = (
            <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
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
          );

          // For members, make events clickable
          if (variant === "member") {
            return (
              <Link key={event.id} to={`/events/${event.id}`}>
                {eventContent}
              </Link>
            );
          }

          return <div key={event.id}>{eventContent}</div>;
        })}
      </div>
    );
  };

  // Render CTA based on variant
  const renderCTA = () => {
    switch (variant) {
      case "member":
        return (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/statistics">
                Zobrazit statistiky
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/events">
                Všechny vyjížďky
              </Link>
            </Button>
          </div>
        );
      case "pending":
        return (
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
        );
      default:
        return (
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
        );
    }
  };

  // Render stats button based on variant
  const renderStatsButton = () => {
    if (variant === "member") {
      return (
        <Button variant="outline" className="w-full gap-2" asChild>
          <Link to="/statistics">
            Zobrazit celé statistiky
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      );
    }
    
    return (
      <Button variant="outline" className="w-full gap-2" asChild>
        <Link to="/register">
          Zobrazit celé statistiky
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    );
  };

  // Render events button based on variant
  const renderEventsButton = () => {
    if (variant === "member") {
      return (
        <Button variant="outline" className="w-full gap-2" asChild>
          <Link to="/events">
            Přihlásit se na vyjížďky
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      );
    }
    
    return (
      <Button variant="outline" className="w-full gap-2" asChild>
        <Link to="/register">
          Přihlásit se na vyjížďky
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    );
  };

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
            <badgeContent.icon className="w-3 h-3 mr-1.5" />
            {badgeContent.text}
          </Badge>
          <h2 className="text-display font-semibold mb-4">
            {getSectionTitle()}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {getSectionDescription()}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Statistics Card */}
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

                    {/* Top riders */}
                    {renderTopRiders()}
                  </>
                )}

                <div className="mt-6 pt-4 border-t border-border/50">
                  {renderStatsButton()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events Card */}
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

                {renderEvents()}

                <div className="mt-6 pt-4 border-t border-border/50">
                  {renderEventsButton()}
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
          {renderCTA()}
        </div>
      </div>
    </section>
  );
};

export default TeaserSection;
