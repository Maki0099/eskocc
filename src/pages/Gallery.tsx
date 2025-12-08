import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import PhotoUpload from "@/components/gallery/PhotoUpload";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonPhotoGrid } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, ImageIcon } from "lucide-react";
import mallorca2025 from "@/assets/albums/mallorca-2025.jpg";
import mallorca2024 from "@/assets/albums/mallorca-2024.jpg";

interface Photo {
  id: string;
  file_url: string;
  file_name: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  event_id: string | null;
  profile?: {
    full_name: string | null;
  } | null;
  event?: {
    title: string;
  } | null;
}

const externalAlbums = [
  {
    title: "Mallorca 2025",
    url: "https://photos.app.goo.gl/Ma8bocoTRLdCebndA",
    image: mallorca2025,
  },
  {
    title: "Mallorca 2024",
    url: "https://photos.app.goo.gl/RTPTPpkc1kPtMMgBA",
    image: mallorca2024,
  },
];

const Gallery = () => {
  const { user } = useAuth();
  const { isMember } = useUserRole();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: albumsRef, isVisible: albumsVisible } = useScrollAnimation();
  const { ref: photosRef, isVisible: photosVisible } = useScrollAnimation();

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select(`
          *,
          profile:profiles(full_name),
          event:events(title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const eventPhotos = photos.filter((p) => p.event_id);
  const generalPhotos = photos.filter((p) => !p.event_id);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <div 
            ref={headerRef}
            className={`flex items-start justify-between gap-4 mb-8 animate-on-scroll slide-up ${headerVisible ? 'is-visible' : ''}`}
          >
            <div>
              <h1 className="text-4xl font-bold mb-2">Fotogalerie</h1>
              <p className="text-muted-foreground">
                Fotky z akcí a vyjížděk klubu Eskocc
              </p>
            </div>
            {user && isMember && <PhotoUpload onUploadComplete={fetchPhotos} />}
          </div>

          {/* External Google Photos Albums */}
          <div 
            ref={albumsRef}
            className={`mb-12 animate-on-scroll slide-up ${albumsVisible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '100ms' }}
          >
            <h2 className="text-2xl font-semibold mb-4">Výjezdy - Google Foto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {externalAlbums.map((album, index) => (
                <a
                  key={album.title}
                  href={album.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block rounded-lg overflow-hidden border border-border bg-card hover:border-primary transition-all animate-on-scroll scale-in ${albumsVisible ? 'is-visible' : ''}`}
                  style={{ transitionDelay: `${150 + index * 100}ms` }}
                >
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={album.image} 
                      alt={album.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium group-hover:text-primary transition-colors">{album.title}</h3>
                      <p className="text-sm text-muted-foreground">Google Photos album</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div
            ref={photosRef}
            className={`animate-on-scroll slide-up ${photosVisible ? 'is-visible' : ''}`}
            style={{ transitionDelay: '200ms' }}
          >
            {loading ? (
              <SkeletonPhotoGrid count={8} />
            ) : photos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Zatím žádné fotky</p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="all">Všechny ({photos.length})</TabsTrigger>
                  <TabsTrigger value="events">Z vyjížděk ({eventPhotos.length})</TabsTrigger>
                  <TabsTrigger value="general">Ostatní ({generalPhotos.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <PhotoGrid photos={photos} onPhotoDeleted={fetchPhotos} />
                </TabsContent>

                <TabsContent value="events">
                  <PhotoGrid photos={eventPhotos} onPhotoDeleted={fetchPhotos} />
                </TabsContent>

                <TabsContent value="general">
                  <PhotoGrid photos={generalPhotos} onPhotoDeleted={fetchPhotos} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
