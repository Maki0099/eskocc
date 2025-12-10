import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  category_id: string | null;
  is_available: boolean;
  sort_order: number;
}

interface MenuCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
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
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: parallaxRef, offset } = useParallax({ speed: 0.3 });
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation();
  const { ref: galleryRef, isVisible: galleryVisible } = useScrollAnimation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hoursRes, menuRes, categoriesRes, galleryRes] = await Promise.all([
          supabase.from("cafe_opening_hours").select("*").order("day_of_week"),
          supabase.from("cafe_menu_items").select("*").eq("is_available", true).order("sort_order"),
          supabase.from("cafe_menu_categories").select("*").order("sort_order"),
          supabase.from("cafe_gallery").select("*").order("sort_order"),
        ]);

        if (hoursRes.error) throw hoursRes.error;
        if (menuRes.error) throw menuRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (galleryRes.error) throw galleryRes.error;

        setOpeningHours(hoursRes.data || []);
        setMenuItems(menuRes.data || []);
        setCategories(categoriesRes.data || []);
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

  // Build hierarchical menu structure
  const buildMenuStructure = () => {
    // If no categories exist, fall back to simple grouping by category text
    if (categories.length === 0) {
      return menuItems.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { items: [], subcategories: {} };
        }
        acc[item.category].items.push(item);
        return acc;
      }, {} as Record<string, { items: MenuItem[]; subcategories: Record<string, MenuItem[]> }>);
    }

    // Get parent categories (no parent_id)
    const parentCategories = categories.filter(c => !c.parent_id);
    // Get child categories
    const childCategories = categories.filter(c => c.parent_id);

    // Build structure
    const structure: Record<string, { 
      category: MenuCategory;
      items: MenuItem[]; 
      subcategories: { category: MenuCategory; items: MenuItem[] }[] 
    }> = {};

    // Initialize parent categories
    parentCategories.forEach(parent => {
      structure[parent.id] = {
        category: parent,
        items: [],
        subcategories: []
      };

      // Find child categories for this parent
      const children = childCategories.filter(c => c.parent_id === parent.id);
      children.forEach(child => {
        structure[parent.id].subcategories.push({
          category: child,
          items: []
        });
      });
    });

    // Assign menu items to categories
    menuItems.forEach(item => {
      if (item.category_id) {
        // Find category
        const category = categories.find(c => c.id === item.category_id);
        if (category) {
          if (category.parent_id) {
            // It's a subcategory
            const parent = structure[category.parent_id];
            if (parent) {
              const subcat = parent.subcategories.find(s => s.category.id === category.id);
              if (subcat) {
                subcat.items.push(item);
              }
            }
          } else {
            // It's a parent category - add directly
            if (structure[category.id]) {
              structure[category.id].items.push(item);
            }
          }
        }
      } else {
        // No category_id - try to match by category text (legacy)
        // Find matching category by name
        const matchingCat = categories.find(c => c.name === item.category);
        if (matchingCat) {
          if (matchingCat.parent_id) {
            const parent = structure[matchingCat.parent_id];
            if (parent) {
              const subcat = parent.subcategories.find(s => s.category.id === matchingCat.id);
              if (subcat) {
                subcat.items.push(item);
              }
            }
          } else if (structure[matchingCat.id]) {
            structure[matchingCat.id].items.push(item);
          }
        }
      }
    });

    // Also handle items that don't match any category
    const unmatchedItems = menuItems.filter(item => {
      if (item.category_id) {
        return !categories.find(c => c.id === item.category_id);
      }
      return !categories.find(c => c.name === item.category);
    });

    // Group unmatched by category text
    const unmatchedByCategory: Record<string, MenuItem[]> = {};
    unmatchedItems.forEach(item => {
      if (!unmatchedByCategory[item.category]) {
        unmatchedByCategory[item.category] = [];
      }
      unmatchedByCategory[item.category].push(item);
    });

    return { structure, unmatchedByCategory };
  };

  const menuStructure = buildMenuStructure();

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const photosToShow = galleryPhotos.length > 0 
    ? galleryPhotos.map(p => ({ src: p.file_url, alt: p.caption || p.file_name }))
    : defaultPhotos.map((photo, i) => ({ src: photo, alt: `ESKO Kafe ${i + 1}` }));

  // Render menu items list
  const renderMenuItems = (items: MenuItem[]) => (
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
  );

  // Render hierarchical menu
  const renderHierarchicalMenu = () => {
    if (categories.length === 0) {
      // Simple category grouping (fallback)
      const simpleStructure = menuStructure as Record<string, { items: MenuItem[]; subcategories: Record<string, MenuItem[]> }>;
      return Object.entries(simpleStructure).map(([category, data]) => (
        <div key={category}>
          <h3 className="font-semibold text-lg mb-3 text-primary">
            {category}
          </h3>
          {renderMenuItems(data.items)}
        </div>
      ));
    }

    const { structure, unmatchedByCategory } = menuStructure as { 
      structure: Record<string, { category: MenuCategory; items: MenuItem[]; subcategories: { category: MenuCategory; items: MenuItem[] }[] }>;
      unmatchedByCategory: Record<string, MenuItem[]>;
    };

    return (
      <>
        {Object.values(structure)
          .filter(parent => parent.items.length > 0 || parent.subcategories.some(s => s.items.length > 0))
          .map((parent) => (
            <div key={parent.category.id} className="mb-8 last:mb-0">
              <h3 className="font-bold text-xl mb-4 text-primary border-b border-primary/20 pb-2">
                {parent.category.name}
              </h3>
              
              {/* Items directly under parent */}
              {parent.items.length > 0 && (
                <div className="mb-4">
                  {renderMenuItems(parent.items)}
                </div>
              )}
              
              {/* Subcategories */}
              {parent.subcategories
                .filter(sub => sub.items.length > 0)
                .map((sub) => (
                  <div key={sub.category.id} className="mb-4 last:mb-0">
                    <h4 className="font-semibold text-base mb-2 text-muted-foreground">
                      {sub.category.name}
                    </h4>
                    {renderMenuItems(sub.items)}
                  </div>
                ))}
            </div>
          ))}
        
        {/* Unmatched categories (legacy items without category_id) */}
        {Object.entries(unmatchedByCategory).map(([category, items]) => (
          <div key={category} className="mb-8 last:mb-0">
            <h3 className="font-bold text-xl mb-4 text-primary border-b border-primary/20 pb-2">
              {category}
            </h3>
            {renderMenuItems(items)}
          </div>
        ))}
      </>
    );
  };

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
                      <div key={i} className="flex justify-between items-center py-2 px-3">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
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
                  <div className="space-y-6">
                    {[...Array(3)].map((_, categoryIndex) => (
                      <div key={categoryIndex}>
                        <Skeleton className="h-6 w-32 mb-3" />
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                              <div className="space-y-1 flex-1">
                                <Skeleton className="h-5 w-2/5" />
                                <Skeleton className="h-4 w-3/5" />
                              </div>
                              <Skeleton className="h-5 w-16" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderHierarchicalMenu()}
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
