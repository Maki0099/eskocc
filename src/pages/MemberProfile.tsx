import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calendar, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import logoRound from "@/assets/logo-round-dark.png";

interface MemberData {
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  strava_id: string | null;
  created_at: string;
}

interface EventParticipation {
  id: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    event_date: string;
    location: string;
  };
}

type AppRole = "pending" | "member" | "active_member" | "admin";

const roleLabels: Record<AppRole, string> = {
  pending: "Čekající",
  member: "Člen",
  active_member: "Aktivní člen",
  admin: "Admin",
};

const MemberProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [member, setMember] = useState<MemberData | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [participations, setParticipations] = useState<EventParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchMemberData = async () => {
      if (!userId) return;

      try {
        // Fetch profile - only public fields
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, nickname, avatar_url, strava_id, created_at")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setMember(profileData);

        // Fetch role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (roleData) {
          setRole(roleData.role as AppRole);
        }

        // Fetch event participations
        const { data: participationData } = await supabase
          .from("event_participants")
          .select(`
            id,
            event_id,
            events (
              id,
              title,
              event_date,
              location
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (participationData) {
          setParticipations(participationData as unknown as EventParticipation[]);
        }
      } catch (error) {
        console.error("Error fetching member data:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [userId]);

  const getInitials = (name: string | null, fallback: string = "U") => {
    if (!name) return fallback;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = () => {
    if (member?.nickname && member?.full_name) {
      return `${member.full_name} "${member.nickname}"`;
    }
    return member?.full_name || member?.nickname || "Neznámý člen";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Člen nenalezen</h1>
        <p className="text-muted-foreground mb-6">Tento profil neexistuje nebo k němu nemáte přístup.</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
      </div>
    );
  }

  const memberSince = format(new Date(member.created_at), "LLLL yyyy", { locale: cs });
  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoRound} alt="Esko.cc" className="h-10 w-10" />
            <span className="font-bold text-xl text-foreground">ESKO.cc</span>
          </Link>
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Card */}
        <Card className="mb-8">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20">
              {member.avatar_url && (
                <AvatarImage src={member.avatar_url} alt={getDisplayName()} />
              )}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              {getDisplayName()}
            </h1>

            <div className="flex gap-2 mb-4">
              {role && role !== "pending" && (
                <Badge variant={role === "admin" ? "default" : "secondary"}>
                  {roleLabels[role]}
                </Badge>
              )}
              {isOwnProfile && (
                <Badge variant="outline">Váš profil</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Členem od {memberSince}
            </p>

            {member.strava_id && (
              <a
                href={`https://www.strava.com/athletes/${member.strava_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-[#FC4C02]/10 text-[#FC4C02] hover:bg-[#FC4C02]/20 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.015 13.828h4.169" />
                </svg>
                Strava profil
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">
                {participations.length}
              </p>
              <p className="text-sm text-muted-foreground">
                {participations.length === 1 ? "účast" : "účastí"} na vyjížďkách
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">
                {format(new Date(member.created_at), "yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">rok registrace</p>
            </CardContent>
          </Card>
        </div>

        {/* Event Participations */}
        {participations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Účasti na vyjížďkách</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {participations.map((participation) => (
                <Link
                  key={participation.id}
                  to={`/events/${participation.event_id}`}
                  className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-medium text-foreground mb-1">
                    {participation.events.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(participation.events.event_date), "d. MMMM yyyy", { locale: cs })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {participation.events.location}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {participations.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tento člen se zatím nezúčastnil žádné vyjížďky.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MemberProfile;
