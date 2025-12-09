import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, Calendar, Image, Shield, Settings, Users, Bell } from "lucide-react";
import logoDark from "@/assets/logo-horizontal-dark.png";
import logoWhite from "@/assets/logo-horizontal-white.png";
import { StravaWidget } from "@/components/dashboard/StravaWidget";
import { ChallengeWidget } from "@/components/dashboard/ChallengeWidget";
import PendingMembershipWidget from "@/components/dashboard/PendingMembershipWidget";
import StravaConnectPrompt from "@/components/dashboard/StravaConnectPrompt";
import StravaClubBanner from "@/components/strava/StravaClubBanner";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, STRAVA_CLUB_URL } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import { useUserStats } from "@/hooks/useUserStats";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { profile, role, loading, refetch } = useUserStats();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const clubMemberToastShown = useRef(false);
  const [sendingTestPush, setSendingTestPush] = useState(false);

  const handleTestPush = async () => {
    setSendingTestPush(true);
    try {
      const { data, error } = await supabase.functions.invoke('push-send', {
        body: { type: 'test', message: 'Toto je testovací notifikace z ESKO.cc' }
      });
      
      if (error) throw error;
      
      toast({
        title: "Testovací notifikace odeslána",
        description: `Odesláno: ${data?.sent || 0}, Selhalo: ${data?.failed || 0}`,
      });
    } catch (error) {
      console.error('Error sending test push:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat testovací notifikaci.",
        variant: "destructive",
      });
    } finally {
      setSendingTestPush(false);
    }
  };

  // Handle Strava connection callback
  useEffect(() => {
    if (searchParams.get('strava') === 'connected') {
      refetch();
      // Remove query param
      searchParams.delete('strava');
      setSearchParams(searchParams, { replace: true });
      // Show success toast
      toast({
        title: "Strava propojena",
        description: "Váš účet Strava byl úspěšně propojen.",
      });
    }
  }, [searchParams, setSearchParams, refetch, toast]);

  // Show toast when user becomes club member (first detection)
  useEffect(() => {
    if (profile?.is_strava_club_member && !clubMemberToastShown.current) {
      const shownKey = `club_member_toast_${user?.id}`;
      const alreadyShown = localStorage.getItem(shownKey);
      if (!alreadyShown) {
        toast({
          title: "Vítej v klubu ESKO.cc!",
          description: "Tvé členství ve Strava klubu bylo potvrzeno.",
        });
        localStorage.setItem(shownKey, 'true');
      }
      clubMemberToastShown.current = true;
    }
  }, [profile?.is_strava_club_member, user?.id, toast]);

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName = profile?.nickname || profile?.full_name || user?.email?.split("@")[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to={ROUTES.HOME}>
            <img src={logoDark} alt="ESKO.cc" className="h-10 dark:hidden" />
            <img src={logoWhite} alt="ESKO.cc" className="h-10 hidden dark:block" />
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Odhlásit se
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Welcome section */}
          <div className="mb-12">
            <h1 className="text-3xl font-semibold mb-2">
              Ahoj, {displayName}!
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {role && (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {ROLE_LABELS[role]}
                </span>
              )}
              {profile?.is_strava_club_member && (
                <a href={STRAVA_CLUB_URL} target="_blank" rel="noopener noreferrer">
                  <Badge variant="secondary" className="gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20 transition-colors">
                    <Users className="w-3 h-3" />
                    Člen Strava klubu
                  </Badge>
                </a>
              )}
            </div>
          </div>

          {/* Strava connect prompt from registration */}
          {user && profile && (
            <div className="mb-6">
              <StravaConnectPrompt userId={user.id} hasStrava={!!profile.strava_id} />
            </div>
          )}

          {/* Pending membership widget */}
          {role === "pending" && (
            <div className="mb-8">
              <PendingMembershipWidget userEmail={user?.email} />
            </div>
          )}

          {/* Quick actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to={ROUTES.EVENTS}
              className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors"
            >
              <Calendar className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <h3 className="font-medium mb-1">Vyjížďky</h3>
              <p className="text-sm text-muted-foreground">
                Zobrazit plánované vyjížďky
              </p>
            </Link>

            <Link
              to={ROUTES.GALLERY}
              className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors"
            >
              <Image className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <h3 className="font-medium mb-1">Galerie</h3>
              <p className="text-sm text-muted-foreground">
                Prohlédnout fotky z akcí
              </p>
            </Link>

            <Link
              to={ROUTES.ACCOUNT}
              className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors"
            >
              <Settings className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <h3 className="font-medium mb-1">Můj účet</h3>
              <p className="text-sm text-muted-foreground">
                Upravit profil a nastavení
              </p>
            </Link>

          {role === "admin" && (
              <>
                <Link
                  to={ROUTES.ADMIN}
                  className="group p-6 rounded-2xl border border-primary/20 hover:border-primary/40 bg-primary/5 transition-colors"
                >
                  <Shield className="w-8 h-8 mb-4 text-primary" />
                  <h3 className="font-medium mb-1">Admin Panel</h3>
                  <p className="text-sm text-muted-foreground">
                    Správa uživatelů a jejich rolí
                  </p>
                </Link>

                <button
                  onClick={handleTestPush}
                  disabled={sendingTestPush}
                  className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors text-left disabled:opacity-50"
                >
                  <Bell className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <h3 className="font-medium mb-1">Test Push Notifikace</h3>
                  <p className="text-sm text-muted-foreground">
                    {sendingTestPush ? "Odesílám..." : "Odeslat testovací notifikaci"}
                  </p>
                </button>
              </>
            )}
          </div>

          {/* Challenge Widget */}
          {user && role !== "pending" && (
            <div className="mt-8">
              <ChallengeWidget userId={user.id} />
            </div>
          )}

          {/* Strava Widget */}
          {user && (
            <div className="mt-4">
              <StravaWidget userId={user.id} isClubMember={profile?.is_strava_club_member ?? false} />
            </div>
          )}

          {/* Strava Club Banner */}
          {profile && (
            <div className="mt-4">
              <StravaClubBanner 
                hasStravaConnected={!!profile.strava_id} 
                isClubMember={profile.is_strava_club_member ?? false}
              />
            </div>
          )}

          {/* Profile info */}
          <div className="mt-12 p-6 rounded-2xl border border-border/40">
            <Link to={ROUTES.ACCOUNT} className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium group-hover:text-primary transition-colors">
                  {profile?.full_name || "Bez jména"}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
