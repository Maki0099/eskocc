import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoWhite from "@/assets/logo-horizontal-white.png";
import logoDark from "@/assets/logo-horizontal-dark.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center" onClick={() => window.scrollTo(0, 0)}>
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
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => window.scrollTo(0, 0)}>
              Domů
            </Link>
            <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => window.scrollTo(0, 0)}>
              Vyjížďky
            </Link>
            <Link to="/cafe" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => window.scrollTo(0, 0)}>
              Kavárna
            </Link>
            <Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => window.scrollTo(0, 0)}>
              Galerie
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => window.scrollTo(0, 0)}>
              O klubu
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
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
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setIsMenuOpen(false); window.scrollTo(0, 0); }}>
                Domů
              </Link>
              <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setIsMenuOpen(false); window.scrollTo(0, 0); }}>
                Vyjížďky
              </Link>
              <Link to="/cafe" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setIsMenuOpen(false); window.scrollTo(0, 0); }}>
                Kavárna
              </Link>
              <Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setIsMenuOpen(false); window.scrollTo(0, 0); }}>
                Galerie
              </Link>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setIsMenuOpen(false); window.scrollTo(0, 0); }}>
                O klubu
              </Link>
              <div className="flex gap-3 pt-4 border-t border-border/50">
                {user ? (
                  <Link to="/dashboard" className="flex-1">
                    <Button variant="apple" className="w-full gap-2">
                      <User className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="flex-1">
                      <Button variant="ghost" className="w-full">Přihlásit se</Button>
                    </Link>
                    <Link to="/register" className="flex-1">
                      <Button variant="apple" className="w-full">Registrace</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
