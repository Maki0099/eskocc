import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PhotoGrid from "@/components/gallery/PhotoGrid";
import PhotoUpload from "@/components/gallery/PhotoUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, ImageIcon, Loader2 } from "lucide-react";
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

const Gallery = () => {
  const { user } = useAuth();
  const { isMember } = useUserRole();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

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
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Fotogalerie</h1>
              <p className="text-muted-foreground">
                Fotky z akcí a vyjížděk klubu Eskocc
              </p>
            </div>
            {user && isMember && <PhotoUpload onUploadComplete={fetchPhotos} />}
          </div>

          {/* External Google Photos Albums */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Výjezdy - Google Foto</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="https://photos.app.goo.gl/Ma8bocoTRLdCebndA"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg overflow-hidden border border-border bg-card hover:border-primary transition-all"
              >
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={mallorca2025} 
                    alt="Mallorca 2025" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">Mallorca 2025</h3>
                    <p className="text-sm text-muted-foreground">Google Photos album</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </a>
              <a
                href="https://photos.app.goo.gl/RTPTPpkc1kPtMMgBA"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg overflow-hidden border border-border bg-card hover:border-primary transition-all"
              >
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={mallorca2024} 
                    alt="Mallorca 2024" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">Mallorca 2024</h3>
                    <p className="text-sm text-muted-foreground">Google Photos album</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </a>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
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
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
