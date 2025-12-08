import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User, ChevronRight, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import logoWhite from "@/assets/logo-horizontal-white.png";
import logoDark from "@/assets/logo-horizontal-dark.png";

const navItems = [
  { to: "/", label: "Domů" },
  { to: "/events", label: "Vyjížďky" },
  { to: "/cafe", label: "Kavárna" },
  { to: "/gallery", label: "Galerie" },
  { to: "/about", label: "O klubu" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
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
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <img 
                src={logoDark} 
                alt="ESKO.cc" 
                className="h-8 dark:hidden"
              />
              <img 
                src={logoWhite} 
                alt="ESKO.cc" 
                className="h-8 hidden dark:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
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
                onClick={toggleTheme}
                className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Přepnout tmavý/světlý režim"
              >
                <Sun className="h-5 w-5 transition-all dark:scale-0 dark:opacity-0" />
                <Moon className="absolute inset-0 m-auto h-5 w-5 scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100" />
              </button>
              {loading ? (
                <div className="w-20 h-8 bg-muted animate-pulse rounded-lg"></div>
              ) : user ? (
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Přihlásit se</Button>
                  </Link>
                  <Link to="/register">
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
            {navItems.map((item, index) => (
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
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-background hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">Tmavý režim</span>
              <div className="relative w-10 h-6 rounded-full bg-muted transition-colors">
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-all ${theme === "dark" ? "left-5" : "left-1"}`} />
              </div>
            </button>
            
            {loading ? (
              <div className="h-12 bg-muted animate-pulse rounded-xl"></div>
            ) : user ? (
              <Link to="/dashboard" className="block">
                <Button variant="apple" className="w-full h-12 gap-2 text-base rounded-xl">
                  <User className="w-5 h-5" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col gap-3">
                <Link to="/register" className="block">
                  <Button variant="apple" className="w-full h-12 text-base rounded-xl">
                    Registrace
                  </Button>
                </Link>
                <Link to="/login" className="block">
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
