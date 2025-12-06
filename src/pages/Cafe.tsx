import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useParallax } from "@/hooks/useParallax";

import cafeInterior1 from "@/assets/cafe/cafe-interior-1.jpg";
import cafeTerrace from "@/assets/cafe/cafe-terrace.jpg";
import cafeInterior2 from "@/assets/cafe/cafe-interior-2.jpeg";
import cafeInterior3 from "@/assets/cafe/cafe-interior-3.jpeg";

interface OpeningHour {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
}

interface GalleryPhoto {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
}

const dayNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

// Static default photos
const defaultPhotos = [cafeInterior1, cafeInterior2, cafeInterior3, cafeTerrace];

const Cafe = () => {
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: parallaxRef, offset } = useParallax({ speed: 0.3 });
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { ref: galleryRef, isVisible: galleryVisible } = useScrollAnimation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hoursRes, menuRes, galleryRes] = await Promise.all([
          supabase.from("cafe_opening_hours").select("*").order("day_of_week"),
          supabase.from("cafe_menu_items").select("*").eq("is_available", true).order("sort_order"),
          supabase.from("cafe_gallery").select("*").order("sort_order"),
        ]);

        if (hoursRes.error) throw hoursRes.error;
        if (menuRes.error) throw menuRes.error;
        if (galleryRes.error) throw galleryRes.error;

        setOpeningHours(hoursRes.data || []);
        setMenuItems(menuRes.data || []);
        setGalleryPhotos(galleryRes.data || []);
      } catch (error) {
        console.error("Error fetching cafe data:", error);
        toast.error("Nepodařilo se načíst data kavárny");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get current day to highlight
  const today = new Date().getDay();

  // Reorder to start with Monday (1) and end with Sunday (0)
  const orderedHours = [...openingHours].sort((a, b) => {
    const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
    const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
    return orderA - orderB;
  });

  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const photosToShow = galleryPhotos.length > 0 
    ? galleryPhotos.map(p => ({ src: p.file_url, alt: p.caption || p.file_name }))
    : defaultPhotos.map((photo, i) => ({ src: photo, alt: `ESKO Kafe ${i + 1}` }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Hero Section with Parallax */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden pt-14">
        <div 
          ref={parallaxRef}
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translateY(${offset}px) scale(1.1)` }}
        >
          <img
            src={cafeInterior1}
            alt="ESKO Kafe interiér"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 opacity-0 animate-fade-up animation-delay-100">ESKO Kafe</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-up animation-delay-200">
            Kavárna s výběrovou kávou Vergnano v srdci Karolinky
          </p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div 
            ref={contentRef}
            className="grid gap-8 lg:grid-cols-3"
          >
            {/* Opening Hours */}
            <Card 
              className={`lg:col-span-1 animate-on-scroll slide-in-left ${contentVisible ? 'is-visible' : ''}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Otevírací doba
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="h-6 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderedHours.map((hour) => (
                      <div
                        key={hour.id}
                        className={`flex justify-between items-center py-2 px-3 rounded-lg transition-colors ${
                          hour.day_of_week === today
                            ? "bg-primary/10 border border-primary/20"
                            : ""
                        }`}
                      >
                        <span className={`font-medium ${hour.day_of_week === today ? "text-primary" : ""}`}>
                          {dayNames[hour.day_of_week]}
                        </span>
                        {hour.is_closed ? (
                          <Badge variant="secondary">Zavřeno</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Vsetínská 85, 756 05 Karolinka</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menu */}
            <Card 
              className={`lg:col-span-2 animate-on-scroll slide-in-right ${contentVisible ? 'is-visible' : ''}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="w-5 h-5" />
                  Nápojový lístek
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(menuByCategory).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="font-semibold text-lg mb-3 text-primary">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center py-2 border-b border-border/50 last:border-0"
                            >
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <span className="font-semibold whitespace-nowrap ml-4">
                                {item.price} Kč
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Photo Gallery */}
          <div 
            ref={galleryRef}
            className={`mt-12 animate-on-scroll slide-up ${galleryVisible ? 'is-visible' : ''}`}
          >
            <h2 className="text-2xl font-bold mb-6">Fotogalerie</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photosToShow.map((photo, index) => (
                <div
                  key={index}
                  className={`aspect-square overflow-hidden rounded-xl group animate-on-scroll scale-in ${galleryVisible ? 'is-visible' : ''}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cafe;
