import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClubhouseSection = () => {
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="max-w-md">
            <p className="text-sm text-muted-foreground mb-4">Naše základna</p>
            <h2 className="text-display font-semibold mb-6">
              Esko kafe
            </h2>
            <p className="text-muted-foreground mb-8">
              Místo, kde se scházíme před každou vyjížďkou. Skvělá káva, přátelská atmosféra.
            </p>

            <a
              href="https://maps.google.com/?q=Esko+kafe+Brno"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="appleOutline">
                <MapPin className="w-4 h-4 mr-2" />
                Otevřít v mapách
              </Button>
            </a>
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden bg-secondary aspect-video">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2607.6!2d16.6!3d49.2!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDnCsDEyJzAwLjAiTiAxNsKwMzYnMDAuMCJF!5e0!3m2!1scs!2scz!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClubhouseSection;
