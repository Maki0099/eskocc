import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Bike } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bike className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-heading text-2xl font-bold tracking-tight">
              ESKO<span className="text-primary">CC</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Domů
            </Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              O klubu
            </Link>
            <Link to="/events" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Vyjížďky
            </Link>
            <Link to="/gallery" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Galerie
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Přihlásit se</Button>
            </Link>
            <Link to="/register">
              <Button variant="default" size="sm">Registrace</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Domů
              </Link>
              <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                O klubu
              </Link>
              <Link to="/events" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Vyjížďky
              </Link>
              <Link to="/gallery" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Galerie
              </Link>
              <div className="flex gap-3 pt-4">
                <Link to="/login" className="flex-1">
                  <Button variant="ghost" className="w-full">Přihlásit se</Button>
                </Link>
                <Link to="/register" className="flex-1">
                  <Button variant="default" className="w-full">Registrace</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
