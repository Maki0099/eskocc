import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSharedFile, clearSharedFile } from '@/lib/share-utils';
import { parseGpxMetadata, calculateDifficulty, GpxMetadata } from '@/lib/gpx-utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Mountain, Route, Save, Eye, ArrowLeft, FileUp } from 'lucide-react';
import { GpxPreviewMap } from '@/components/map/GpxPreviewMap';

const ShareTarget = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxBase64, setGpxBase64] = useState<string>('');
  const [metadata, setMetadata] = useState<GpxMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [terrainType, setTerrainType] = useState<string>('mixed');

  const shareId = searchParams.get('shareId');

  useEffect(() => {
    const loadSharedFile = async () => {
      if (!shareId) {
        setError('Nebyl nalezen sdílený soubor.');
        setLoading(false);
        return;
      }

      try {
        const file = await getSharedFile(shareId);
        
        if (!file) {
          setError('Sdílený soubor nebyl nalezen nebo již vypršel.');
          setLoading(false);
          return;
        }

        setGpxFile(file);

        // Parse GPX metadata
        const parsedMetadata = await parseGpxMetadata(file);
        
        if (!parsedMetadata) {
          setError('Nepodařilo se parsovat GPX soubor.');
          setLoading(false);
          return;
        }

        setMetadata(parsedMetadata);
        setTitle(parsedMetadata.name || file.name.replace('.gpx', ''));
        setDescription(parsedMetadata.description || '');

        // Read file as base64 for map preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setGpxBase64(base64);
        };
        reader.readAsDataURL(file);

      } catch (err) {
        console.error('Error loading shared file:', err);
        setError('Chyba při načítání souboru.');
      } finally {
        setLoading(false);
      }
    };

    loadSharedFile();
  }, [shareId]);

  const handleSaveRoute = async () => {
    if (!user) {
      toast.error('Pro uložení trasy se musíte přihlásit.');
      navigate('/login');
      return;
    }

    if (!gpxFile || !metadata) {
      toast.error('Chybí data trasy.');
      return;
    }

    setSaving(true);

    try {
      // Upload GPX file to storage
      const fileName = `${Date.now()}-${gpxFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('routes')
        .upload(fileName, gpxFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('routes')
        .getPublicUrl(fileName);

      // Calculate difficulty from distance and elevation
      const difficulty = calculateDifficulty(metadata.distanceKm, metadata.elevationM);

      // Insert route into database
      const { error: insertError } = await supabase
        .from('favorite_routes')
        .insert({
          title: title || 'Nová trasa',
          description: description || null,
          distance_km: metadata.distanceKm,
          elevation_m: metadata.elevationM,
          min_elevation: metadata.minElevation,
          max_elevation: metadata.maxElevation,
          difficulty: difficulty,
          terrain_type: terrainType,
          gpx_file_url: urlData.publicUrl,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      // Clear the shared file from cache
      if (shareId) {
        await clearSharedFile(shareId);
      }

      toast.success('Trasa byla úspěšně uložena!');
      navigate('/events');

    } catch (err) {
      console.error('Error saving route:', err);
      toast.error('Nepodařilo se uložit trasu.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewOnly = () => {
    // Clear the shared file and navigate away
    if (shareId) {
      clearSharedFile(shareId);
    }
    navigate('/events');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Načítám sdílený GPX soubor...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-destructive">Chyba</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/events')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět na vyjížďky
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <FileUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Sdílený GPX soubor</h1>
              <p className="text-muted-foreground">
                {gpxFile?.name}
              </p>
            </div>
          </div>

          {/* Map Preview */}
          {gpxBase64 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Náhled trasy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[300px] rounded-b-lg overflow-hidden">
                  <GpxPreviewMap gpxData={gpxBase64} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {metadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <MapPin className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{metadata.distanceKm.toFixed(1)} km</p>
                  <p className="text-xs text-muted-foreground">Vzdálenost</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Mountain className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{Math.round(metadata.elevationM)} m</p>
                  <p className="text-xs text-muted-foreground">Převýšení</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{metadata.minElevation?.toFixed(0) || '-'} m</p>
                  <p className="text-xs text-muted-foreground">Min. nadm. výška</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{metadata.maxElevation?.toFixed(0) || '-'} m</p>
                  <p className="text-xs text-muted-foreground">Max. nadm. výška</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Form for saving */}
          {user ? (
            <Card>
              <CardHeader>
                <CardTitle>Uložit jako trasu</CardTitle>
                <CardDescription>
                  Upravte detaily a uložte trasu do vaší kolekce
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Název trasy</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Zadejte název trasy"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Popis</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Volitelný popis trasy"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terrain">Typ terénu</Label>
                  <Select value={terrainType} onValueChange={setTerrainType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte typ terénu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">Silnice</SelectItem>
                      <SelectItem value="gravel">Gravel</SelectItem>
                      <SelectItem value="mtb">MTB</SelectItem>
                      <SelectItem value="mixed">Kombinace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={handleSaveRoute} 
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ukládám...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Uložit trasu
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleViewOnly}
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Pouze zobrazit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Přihlaste se pro uložení</CardTitle>
                <CardDescription>
                  Pro uložení trasy do kolekce se musíte přihlásit.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate('/login')} className="w-full">
                  Přihlásit se
                </Button>
                <Button variant="outline" onClick={handleViewOnly} className="w-full">
                  <Eye className="mr-2 h-4 w-4" />
                  Pouze zobrazit
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShareTarget;
