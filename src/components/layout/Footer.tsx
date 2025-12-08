import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import logoRoundDark from "@/assets/logo-round-dark.png";
import logoRound from "@/assets/logo-round.png";
import DecreeModal from "./DecreeModal";

const Footer = () => {
  const { resolvedTheme } = useTheme();
  const stravaWidgetUrl = `https://www.strava.com/clubs/1860524/latest-rides/66a685c4f0e28a76273a2be113608f98a113075b?show_rides=false${resolvedTheme === 'dark' ? '&style=dark' : ''}`;
  return <footer className="border-t border-border/50 bg-card">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-4">
              <img 
                src={logoRoundDark} 
                alt="ESKO.cc" 
                className="h-16 w-16 dark:hidden" 
              />
              <img 
                src={logoRound} 
                alt="ESKO.cc" 
                className="h-16 w-16 hidden dark:block" 
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">Cyklistický klub 
pro všechny nadšence.</p>
            <DecreeModal />
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
              <li>Vsetínská 85</li>
              <li>756 05 Karolinka</li>
              <li>
                <a href="mailto:info@eskocc.cz" className="hover:text-foreground transition-colors">
                  info@eskocc.cz
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-medium mb-4">Sledujte nás</h4>
            <div className="flex gap-4 mb-4">
              <a href="https://www.facebook.com/eskokafe" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Facebook
              </a>
              <a href="https://www.strava.com/clubs/1860524" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Strava
              </a>
            </div>
            <iframe 
              key={resolvedTheme}
              allowTransparency={true}
              frameBorder="0" 
              height="160" 
              scrolling="no" 
              src={stravaWidgetUrl}
              width="300"
              className="rounded-lg"
              title="Strava Club Widget"
            />
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ESKO.cc. Všechna práva vyhrazena.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;