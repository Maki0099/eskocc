import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Calendar, Image, Shield, Settings } from "lucide-react";
import logoDark from "@/assets/logo-horizontal-dark.png";
import { StravaWidget } from "@/components/dashboard/StravaWidget";
type AppRole = "pending" | "member" | "active_member" | "admin";

const roleLabels: Record<AppRole, string> = {
  pending: "Čekající na schválení",
  member: "Člen",
  active_member: "Aktivní člen",
  admin: "Administrátor",
};

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  nickname: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, nickname")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      }

      setLoading(false);
    };

    fetchUserData();
  }, [user]);

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
          <Link to="/">
            <img src={logoDark} alt="ESKO.cc" className="h-8" />
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
            <p className="text-muted-foreground">
              {role && (
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {roleLabels[role]}
                </span>
              )}
            </p>
          </div>

          {/* Pending state message */}
          {role === "pending" && (
            <div className="bg-muted/50 rounded-2xl p-6 mb-8">
              <h2 className="font-medium mb-2">Tvůj účet čeká na schválení</h2>
              <p className="text-sm text-muted-foreground">
                Administrátor klubu brzy ověří tvoji registraci. Mezitím se můžeš podívat na naše plánované vyjížďky.
              </p>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/events"
              className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors"
            >
              <Calendar className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <h3 className="font-medium mb-1">Vyjížďky</h3>
              <p className="text-sm text-muted-foreground">
                Zobrazit plánované vyjížďky
              </p>
            </Link>

            <Link
              to="/gallery"
              className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors"
            >
              <Image className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <h3 className="font-medium mb-1">Galerie</h3>
              <p className="text-sm text-muted-foreground">
                Prohlédnout fotky z akcí
              </p>
            </Link>

            <Link
              to="/account"
              className="group p-6 rounded-2xl border border-border/40 hover:border-border transition-colors"
            >
              <Settings className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <h3 className="font-medium mb-1">Můj účet</h3>
              <p className="text-sm text-muted-foreground">
                Upravit profil a nastavení
              </p>
            </Link>

            {role === "admin" && (
              <Link
                to="/admin"
                className="group p-6 rounded-2xl border border-primary/20 hover:border-primary/40 bg-primary/5 transition-colors"
              >
                <Shield className="w-8 h-8 mb-4 text-primary" />
                <h3 className="font-medium mb-1">Admin Panel</h3>
                <p className="text-sm text-muted-foreground">
                  Správa uživatelů a jejich rolí
                </p>
              </Link>
            )}
          </div>

          {/* Strava Widget */}
          {user && (
            <div className="mt-8">
              <StravaWidget userId={user.id} />
            </div>
          )}

          {/* Profile info */}
          <div className="mt-12 p-6 rounded-2xl border border-border/40">
            <Link to="/account" className="flex items-center gap-4 group">
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
