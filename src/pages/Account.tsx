import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, CalendarIcon, Loader2, Link as LinkIcon, Check, X, Bell } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import logoDark from "@/assets/logo-horizontal-dark.png";
import { StravaStats } from "@/components/strava/StravaStats";
import StravaClubBanner from "@/components/strava/StravaClubBanner";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";

interface Profile {
  full_name: string | null;
  nickname: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  strava_id: string | null;
  email: string;
  is_strava_club_member: boolean | null;
}

const Account = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [connectingStrava, setConnectingStrava] = useState(false);

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [stravaId, setStravaId] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();

  // Handle Strava OAuth callback
  useEffect(() => {
    const stravaStatus = searchParams.get('strava');
    if (stravaStatus === 'success') {
      toast({
        title: "Strava propojena",
        description: "Tvůj Strava účet byl úspěšně propojen",
      });
      // Refresh profile to get new strava_id
      if (user) {
        supabase
          .from("profiles")
          .select("strava_id")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.strava_id) {
              setStravaId(data.strava_id);
              setProfile(prev => prev ? { ...prev, strava_id: data.strava_id } : null);
            }
          });
      }
      setSearchParams({});
    } else if (stravaStatus === 'error') {
      toast({
        variant: "destructive",
        title: "Chyba propojení",
        description: "Nepodařilo se propojit Strava účet",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, setSearchParams, user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, nickname, birth_date, avatar_url, strava_id, email, is_strava_club_member")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setNickname(data.nickname || "");
        setStravaId(data.strava_id || "");
        if (data.birth_date) {
          setBirthDate(new Date(data.birth_date));
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Extract Strava ID from URL or use as-is
    let parsedStravaId = stravaId.trim();
    const stravaUrlMatch = parsedStravaId.match(/strava\.com\/athletes\/(\d+)/);
    if (stravaUrlMatch) {
      parsedStravaId = stravaUrlMatch[1];
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        strava_id: parsedStravaId || null,
        birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
      });
    } else {
      toast({
        title: "Uloženo",
        description: "Tvoje údaje byly aktualizovány",
      });
      // Extract Strava ID for state update
      let parsedStravaIdForState = stravaId.trim();
      const stravaUrlMatchForState = parsedStravaIdForState.match(/strava\.com\/athletes\/(\d+)/);
      if (stravaUrlMatchForState) {
        parsedStravaIdForState = stravaUrlMatchForState[1];
        setStravaId(parsedStravaIdForState);
      }
      setProfile((prev) => prev ? {
        ...prev,
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        strava_id: parsedStravaIdForState || null,
        birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
      } : null);
    }

    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Neplatný formát",
        description: "Povolen je pouze JPG, PNG nebo WebP",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Příliš velký soubor",
        description: "Maximální velikost je 5 MB",
      });
      return;
    }

    setUploadingAvatar(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Chyba nahrávání",
        description: "Nepodařilo se nahrát obrázek",
      });
      setUploadingAvatar(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se aktualizovat profil",
      });
    } else {
      setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast({
        title: "Avatar nahrán",
        description: "Tvoje profilová fotka byla aktualizována",
      });
    }

    setUploadingAvatar(false);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se odeslat email pro reset hesla",
      });
    } else {
      toast({
        title: "Email odeslán",
        description: "Zkontroluj svou emailovou schránku",
      });
    }
  };

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
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět
            </Button>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-semibold mb-8">Můj účet</h1>

          {/* Avatar section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-medium text-muted-foreground">
                    {fullName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Klikni pro změnu avataru
            </p>
          </div>

          {/* Profile form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="h-12 rounded-xl bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Celé jméno</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jan Novák"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Přezdívka</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Honza"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Datum narození</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 rounded-xl justify-start text-left font-normal",
                      !birthDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "d. MMMM yyyy", { locale: cs }) : "Vyber datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    className="pointer-events-auto"
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Strava connection */}
            <div className="space-y-2">
              <Label>Strava propojení</Label>
              {stravaId ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Check className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Propojeno</p>
                    <a 
                      href={`https://www.strava.com/athletes/${stravaId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      strava.com/athletes/{stravaId}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!user) return;
                      setStravaId("");
                      // Clear strava_id and all OAuth tokens from database
                      const { error } = await supabase
                        .from("profiles")
                        .update({ 
                          strava_id: null,
                          strava_access_token: null,
                          strava_refresh_token: null,
                          strava_token_expires_at: null
                        })
                        .eq("id", user.id);
                      
                      if (error) {
                        toast({
                          variant: "destructive",
                          title: "Chyba",
                          description: "Nepodařilo se odpojit Strava účet",
                        });
                      } else {
                        setProfile(prev => prev ? { ...prev, strava_id: null } : null);
                        toast({
                          title: "Odpojeno",
                          description: "Strava účet byl úspěšně odpojen",
                        });
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
              <Button
                  variant="outline"
                  onClick={async () => {
                    if (!user) return;
                    setConnectingStrava(true);
                    
                    const redirectUrl = `${window.location.origin}/account`;
                    
                    try {
                      const { data, error } = await supabase.functions.invoke('strava-auth', {
                        body: { userId: user.id, redirectUrl }
                      });
                      
                      if (error) throw error;
                      
                      if (data?.authUrl) {
                        window.location.href = data.authUrl;
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Chyba",
                          description: "Nepodařilo se získat přihlašovací odkaz ze Stravy.",
                        });
                        setConnectingStrava(false);
                      }
                    } catch (err: any) {
                      toast({
                        variant: "destructive",
                        title: "Chyba",
                        description: err?.message || "Nepodařilo se spustit propojení se Stravou.",
                      });
                      setConnectingStrava(false);
                    }
                  }}
                  disabled={connectingStrava}
                  className="w-full h-12 rounded-xl"
                >
                  {connectingStrava ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Přesměrovávám...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Propojit se Stravou
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Propoj svůj Strava účet pro automatické načítání aktivit
              </p>
              
              {/* Strava Stats */}
              {user && <StravaStats userId={user.id} isConnected={!!stravaId} />}
              
              {/* Strava Club Membership Status */}
              {stravaId && (
                <div className="mt-4">
                  {profile?.is_strava_club_member ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Check className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Člen klubu ESKO.cc na Stravě</span>
                    </div>
                  ) : (
                    <StravaClubBanner hasStravaConnected={true} isClubMember={false} />
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              variant="apple"
              className="w-full h-12 mt-6"
            >
              {saving ? "Ukládám..." : "Uložit změny"}
            </Button>
          </div>

          {/* Notifications section */}
          <div className="mt-12 pt-8 border-t border-border/40">
            <h2 className="font-medium mb-4">Notifikace</h2>
            <div className="space-y-4">
              <PushNotificationToggle />
              <Link to={ROUTES.NOTIFICATIONS}>
                <Button variant="outline" className="w-full h-12 rounded-xl gap-2">
                  <Bell className="w-4 h-4" />
                  Zobrazit všechny notifikace
                </Button>
              </Link>
            </div>
          </div>

          {/* Password section */}
          <div className="mt-8 pt-8 border-t border-border/40">
            <h2 className="font-medium mb-4">Změna hesla</h2>
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              className="w-full h-12 rounded-xl"
            >
              Odeslat email pro reset hesla
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Account;
