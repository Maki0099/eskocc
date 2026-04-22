import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, CalendarIcon, Loader2, Bell, RotateCcw, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import logoDark from "@/assets/logo-horizontal-dark.png";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { useTour } from "@/hooks/useTour";
import TourProvider from "@/components/tour/TourProvider";
import { AccountPageSkeleton } from "@/components/skeletons/PageSkeletons";
import CheckForUpdatesButton from "@/components/pwa/CheckForUpdatesButton";

interface Profile {
  full_name: string | null;
  nickname: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  email: string;
  club_match_name: string | null;
}

const Account = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { startTour, endTour, resetAllTours } = useTour();
  const [runTour, setRunTour] = useState(false);

  const handleStartTour = () => {
    setRunTour(true);
    startTour("account");
  };

  const handleEndTour = () => {
    setRunTour(false);
    endTour();
  };

  const handleResetAllTours = () => {
    resetAllTours();
    toast({
      title: "Průvodce resetován",
      description: "Průvodce aplikací se znovu zobrazí při další návštěvě.",
    });
  };

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [clubMatchName, setClubMatchName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, nickname, birth_date, avatar_url, email, club_match_name")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setFullName(data.full_name || "");
        setNickname(data.nickname || "");
        setClubMatchName(data.club_match_name || "");
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

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        club_match_name: clubMatchName.trim() || null,
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
      setProfile((prev) => prev ? {
        ...prev,
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        club_match_name: clubMatchName.trim() || null,
        birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
      } : null);
    }

    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Neplatný formát",
        description: "Povolen je pouze JPG, PNG nebo WebP",
      });
      return;
    }

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

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

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
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        </header>
        <main className="container mx-auto px-6 py-12">
          <AccountPageSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TourProvider tourId="account" run={runTour} onFinish={handleEndTour} />

      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl" data-tour="account-header">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={logoDark} alt="ESKO.cc" className="h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartTour}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Nápověda"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zpět
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-semibold mb-8">Můj účet</h1>

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

          <div className="space-y-4" data-tour="personal-info">
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

            {/* Strava club name match */}
            <div className="space-y-2">
              <Label htmlFor="clubMatchName">Mé jméno na Stravě v klubu</Label>
              <Input
                id="clubMatchName"
                type="text"
                placeholder="např. Jan N."
                value={clubMatchName}
                onChange={(e) => setClubMatchName(e.target.value)}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Vyplň pouze pokud se tvé jméno na Stravě liší od jména v profilu. Slouží pro automatické párování aktivit z klubu ESKO.cc.
              </p>
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

          <div className="mt-12 pt-8 border-t border-border/40" data-tour="notifications-section">
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

          <div className="mt-8 pt-8 border-t border-border/40" data-tour="tour-restart">
            <h2 className="font-medium mb-4">Nápověda</h2>
            <Button
              variant="outline"
              onClick={handleResetAllTours}
              className="w-full h-12 rounded-xl gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Resetovat průvodce aplikací
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Průvodce se znovu zobrazí při další návštěvě dashboardu
            </p>
          </div>

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
