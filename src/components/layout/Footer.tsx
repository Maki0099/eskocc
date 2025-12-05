import { Link } from "react-router-dom";
import { Bike, Facebook, MapPin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bike className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-heading text-2xl font-bold tracking-tight">
                ESKO<span className="text-primary">CC</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Cyklistický klub pro všechny nadšence na dvou kolech.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-4">Navigace</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Domů</Link></li>
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">O klubu</Link></li>
              <li><Link to="/events" className="text-sm text-muted-foreground hover:text-primary transition-colors">Vyjížďky</Link></li>
              <li><Link to="/gallery" className="text-sm text-muted-foreground hover:text-primary transition-colors">Galerie</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-4">Kontakt</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Esko kafe, Brno</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span>info@eskocc.cz</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-4">Sledujte nás</h4>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/eskokafe"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.strava.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EskoCC. Všechna práva vyhrazena.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
