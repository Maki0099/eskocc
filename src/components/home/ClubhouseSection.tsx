import { MapPin, Clock, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClubhouseSection = () => {
  return (
    <section className="py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-widest">Naše základna</span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mt-4 mb-6">
              Klubovna Esko kafe
            </h2>
            <p className="text-muted-foreground mb-8">
              Naše klubovna je srdcem EskoCC. Místo, kde se scházíme před každou vyjížďkou, 
              sdílíme zážitky a budujeme přátelství. Vždy s výbornou kávou v ruce.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Adresa</h4>
                  <p className="text-muted-foreground text-sm">Esko kafe, Brno</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Srazy</h4>
                  <p className="text-muted-foreground text-sm">Dle rozpisu vyjížděk</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Před vyjížďkou</h4>
                  <p className="text-muted-foreground text-sm">Káva zdarma pro členy</p>
                </div>
              </div>
            </div>

            <a
              href="https://maps.app.goo.gl/eskokafe"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <MapPin className="w-4 h-4 mr-2" />
                Otevřít v Google Maps
              </Button>
            </a>
          </div>

          {/* Map */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2607.6!2d16.6!3d49.2!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDnCsDEyJzAwLjAiTiAxNsKwMzYnMDAuMCJF!5e0!3m2!1scs!2scz!4v1"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-primary to-accent rounded-2xl -z-10 opacity-50" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClubhouseSection;
