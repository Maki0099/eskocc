import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClubLocationMap from "@/components/map/ClubLocationMap";

const ClubhouseSection = () => {
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="max-w-md">
            <p className="text-sm text-muted-foreground mb-4">Naše základna</p>
            <h2 className="text-display font-semibold mb-6">
              Kde nás najdete
            </h2>
            <p className="text-muted-foreground mb-4">
              Vsetínská 85<br />
              756 05 Karolinka
            </p>
            <p className="text-muted-foreground mb-8">
              Místo, kde se scházíme a plánujeme společné vyjížďky.
            </p>

            <a
              href="https://maps.google.com/?q=Vsetínská+85,+Karolinka"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="appleOutline">
                <MapPin className="w-4 h-4 mr-2" />
                Otevřít v Google Maps
              </Button>
            </a>
          </div>

          {/* Map */}
          <ClubLocationMap className="rounded-2xl overflow-hidden aspect-video shadow-lg" />
        </div>
      </div>
    </section>
  );
};

export default ClubhouseSection;
