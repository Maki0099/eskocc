import { Link } from "react-router-dom";
import logoDark from "@/assets/logo-horizontal-dark.png";
import logoWhite from "@/assets/logo-horizontal-white.png";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-secondary/30">
      <div className="container mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img 
                src={logoDark} 
                alt="ESKO.cc" 
                className="h-5 dark:hidden"
              />
              <img 
                src={logoWhite} 
                alt="ESKO.cc" 
                className="h-5 hidden dark:block"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              Cyklistický klub pro všechny nadšence.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-medium mb-4">Navigace</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Domů</Link></li>
              <li><Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Vyjížďky</Link></li>
              <li><Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Galerie</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">O klubu</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-medium mb-4">Kontakt</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Esko kafe, Brno</li>
              <li>info@esko.cc</li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-medium mb-4">Sledujte nás</h4>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/eskokafe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Facebook
              </a>
              <a
                href="https://www.strava.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Strava
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ESKO.cc. Všechna práva vyhrazena.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
