import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, ChevronRight, Moon, Sun, Sunrise, Download, Bell, HelpCircle, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useTour, TourId } from "@/hooks/useTour";
import TourProvider from "@/components/tour/TourProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import logoWhite from "@/assets/logo-horizontal-white.png";
import logoDark from "@/assets/logo-horizontal-dark.png";
import { ROUTES, NAV_ITEMS, MEMBER_NAV_ITEMS, getMemberProfilePath } from "@/lib/routes";
import { getInitials, formatShortName } from "@/lib/user-utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "./NotificationBell";

// Mobile notification link component
const MobileNotificationLink = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <Link to={ROUTES.NOTIFICATIONS} className="block">
      <Button variant="outline" className="w-full h-12 gap-2 text-base rounded-xl relative">
        <Bell className="w-5 h-5" />
        Notifikace
        {unreadCount > 0 && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
};

// Helper to determine tour ID from current path
const getTourIdFromPath = (pathname: string): TourId | null => {
  if (pathname === "/") return "index";
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/account") return "account";
  if (pathname === "/events") return "events";
  if (pathname.startsWith("/events/")) return "eventDetail";
  if (pathname === "/gallery") return "gallery";
  if (pathname === "/statistics") return "statistics";
  return null;
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme, effectiveTheme, sunTimes } = useTheme();
  const location = useLocation();
  const { startTour, endTour } = useTour();
  const [runTour, setRunTour] = useState(false);

  const currentTourId = getTourIdFromPath(location.pathname);
  const hasTour = currentTourId !== null;
  const navigate = useNavigate();

  const visibleNavItems = user ? [...NAV_ITEMS, ...MEMBER_NAV_ITEMS] : [...NAV_ITEMS];

  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("member_profiles_public")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) {
          setProfile(data);
        }
        setProfileLoading(false);
      }
    };
    loadProfile();
    return () => { cancelled = true; };
  }, [user]);

  const handleStartTour = () => {
    if (currentTourId) {
      setRunTour(true);
      startTour(currentTourId);
    }
  };

  const handleEndTour = () => {
    setRunTour(false);
    endTour();
  };

  const cycleTheme = () => {
    if (theme === "auto") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("auto");
    }
  };

  const getThemeIcon = () => {
    if (theme === "auto") return <Sunrise className="h-5 w-5" />;
    if (theme === "light") return <Sun className="h-5 w-5" />;
    return <Moon className="h-5 w-5" />;
  };

  const getThemeLabel = () => {
    if (theme === "auto") {
      if (sunTimes) {
        const isDay = effectiveTheme === "light";
        const nextSwitch = isDay ? sunTimes.sunset : sunTimes.sunrise;
        const timeStr = nextSwitch.toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `Auto (${isDay ? "západ" : "východ"} ${timeStr})`;
      }
      return "Auto režim";
    }
    if (theme === "light") return "Světlý režim";
    return "Tmavý režim";
  };

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const isActive = (path: string) => {
    if (path === ROUTES.HOME) return location.pathname === ROUTES.HOME;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Tour Provider - renders only when tour is available for current page */}
      {currentTourId && (
        <TourProvider tourId={currentTourId} run={runTour} onFinish={handleEndTour} />
      )}
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={ROUTES.HOME} className="flex items-center">
              <img 
                src={logoDark} 
                alt="ESKO.cc" 
                className="h-10 dark:hidden"
              />
              <img 
                src={logoWhite} 
                alt="ESKO.cc" 
                className="h-10 hidden dark:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-8">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm transition-colors ${
                    isActive(item.to)
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={cycleTheme}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Přepnout režim zobrazení"
              >
                {getThemeIcon()}
              </button>
              {hasTour && (
                <button
                  onClick={handleStartTour}
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Nápověda"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              )}
              {loading ? (
                <div className="w-20 h-8 bg-muted animate-pulse rounded-lg"></div>
              ) : user ? (
                <>
                  <NotificationBell />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 pl-2 pr-3 h-10 rounded-full"
                        aria-label="Otevřít uživatelské menu"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || user.email || "Uživatel"} />
                          <AvatarFallback className="text-xs">
                            {profileLoading ? "…" : getInitials(profile?.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden lg:inline max-w-[140px] truncate">
                          {profileLoading ? "Načítání…" : profile?.full_name || user.email}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link to={getMemberProfilePath(user.id)} className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Můj profil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={ROUTES.ACCOUNT} className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Nastavení účtu
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={ROUTES.DASHBOARD} className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          signOut();
                          navigate(ROUTES.HOME);
                        }}
                        className="cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Odhlásit se
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to={ROUTES.LOGIN}>
                    <Button variant="ghost" size="sm">Přihlásit se</Button>
                  </Link>
                  <Link to={ROUTES.REGISTER}>
                    <Button variant="apple" size="sm">Registrace</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 -mr-2 text-foreground rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Zavřít menu" : "Otevřít menu"}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-16 left-0 right-0 bottom-0 z-40 bg-background md:hidden transition-transform duration-300 ease-out ${
          isMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto py-4">
            {visibleNavItems.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-6 py-4 text-lg transition-all ${
                  isActive(item.to)
                    ? "text-foreground font-medium bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span>{item.label}</span>
                <ChevronRight className={`w-5 h-5 transition-opacity ${isActive(item.to) ? "opacity-100" : "opacity-0"}`} />
              </Link>
            ))}
          </div>

          {/* Mobile Theme Toggle & Auth Buttons */}
          <div className="p-6 border-t border-border/50 bg-muted/30 space-y-4">
            <Link
              to={ROUTES.INSTALL}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                Nainstalovat aplikaci
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            
            <button
              onClick={cycleTheme}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                {theme === "auto" ? <Sunrise className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {getThemeLabel()}
              </span>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${theme === "light" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div className={`w-2 h-2 rounded-full transition-colors ${theme === "auto" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div className={`w-2 h-2 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`} />
              </div>
            </button>

            {hasTour && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleStartTour();
                }}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Nápověda pro tuto stránku
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            
            {loading ? (
              <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
            ) : user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || user.email || "Uživatel"} />
                    <AvatarFallback>
                      {profileLoading ? "…" : getInitials(profile?.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profileLoading ? "Načítání…" : profile?.full_name || "Člen klubu"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                <Link
                  to={getMemberProfilePath(user.id)}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Můj profil
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>

                <Link
                  to={ROUTES.ACCOUNT}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Nastavení účtu
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>

                <Link
                  to={ROUTES.DASHBOARD}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>

                <MobileNotificationLink />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    signOut();
                    navigate(ROUTES.HOME);
                  }}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Odhlásit se
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link to={ROUTES.REGISTER} className="block">
                  <Button variant="apple" className="w-full h-12 text-base rounded-xl">
                    Registrace
                  </Button>
                </Link>
                <Link to={ROUTES.LOGIN} className="block">
                  <Button variant="outline" className="w-full h-12 text-base rounded-xl">
                    Přihlásit se
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Header;
