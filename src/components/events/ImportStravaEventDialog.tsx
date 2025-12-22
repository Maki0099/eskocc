import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface StravaClubEvent {
  id: string;
  strava_event_id: string;
  title: string;
  description: string | null;
  event_date: string;
  address: string | null;
  sport_type: string | null;
  organizing_athlete_name: string | null;
  participant_count: number;
  start_latlng?: any;
  skill_level?: number | null;
  terrain?: number | null;
  route_polyline?: string | null;
  strava_route_id?: string | null;
  route_id?: string | null;
}

interface ImportStravaEventDialogProps {
  stravaEvent: StravaClubEvent;
  onImported: () => void;
}

// Map Strava skill levels to difficulty
const mapSkillLevel = (skillLevel: number | null | undefined): string | null => {
  if (!skillLevel) return null;
  // Strava: 1=casual, 2=tempo, 4=hammerfest
  if (skillLevel === 1) return "easy";
  if (skillLevel === 2) return "medium";
  if (skillLevel === 4) return "hard";
  return null;
};

// Map Strava terrain to terrain_type
const mapTerrain = (terrain: number | null | undefined): string | null => {
  if (terrain === undefined || terrain === null) return null;
  // Strava: 0=road, 1=mixed, 2=mostly off road
  if (terrain === 0) return "road";
  if (terrain === 1) return "mixed";
  if (terrain === 2) return "gravel";
  return null;
};

const ImportStravaEventDialog = ({ stravaEvent, onImported }: ImportStravaEventDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingGpx, setDownloadingGpx] = useState(false);
  
  // Form state with pre-filled values from Strava
  const [title, setTitle] = useState(stravaEvent.title);
  const [description, setDescription] = useState(stravaEvent.description || "");
  const [location, setLocation] = useState(stravaEvent.address || "");
  const [difficulty, setDifficulty] = useState(mapSkillLevel(stravaEvent.skill_level) || "");
  const [terrainType, setTerrainType] = useState(mapTerrain(stravaEvent.terrain) || "");
  const [distanceKm, setDistanceKm] = useState("");
  const [elevationM, setElevationM] = useState("");
  
  // GPX download option
  const [downloadGpx, setDownloadGpx] = useState(true);
  const hasRoute = !!(stravaEvent.strava_route_id || stravaEvent.route_id);

  const stravaEventUrl = `https://www.strava.com/clubs/1860524/group_events/${stravaEvent.strava_event_id}`;

  const downloadFromStrava = async (): Promise<{
    gpx_url: string | null;
    cover_image_url: string | null;
    distance_km: number | null;
    elevation_m: number | null;
  }> => {
    const routeId = stravaEvent.strava_route_id || stravaEvent.route_id;
    if (!routeId) return { gpx_url: null, cover_image_url: null, distance_km: null, elevation_m: null };

    setDownloadingGpx(true);
    try {
      const { data, error } = await supabase.functions.invoke('strava-route-gpx', {
        body: { 
          route_id: routeId, 
          user_id: user?.id,
          polyline: stravaEvent.route_polyline
        }
      });

      if (error) throw error;
      
      console.log('Downloaded from Strava:', data);
      return {
        gpx_url: data?.gpx_url || null,
        cover_image_url: data?.cover_image_url || null,
        distance_km: data?.distance_km || null,
        elevation_m: data?.elevation_m || null
      };
    } catch (error) {
      console.error('Error downloading from Strava:', error);
      toast.error("Nepodařilo se stáhnout data ze Strava");
      return { gpx_url: null, cover_image_url: null, distance_km: null, elevation_m: null };
    } finally {
      setDownloadingGpx(false);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast.error("Musíte být přihlášeni");
      return;
    }

    setImporting(true);
    try {
      // Optionally download GPX and cover image from Strava
      let gpxFileUrl: string | null = null;
      let coverImageUrl: string | null = null;
      let routeDistance: number | null = distanceKm ? parseInt(distanceKm) : null;
      let routeElevation: number | null = elevationM ? parseInt(elevationM) : null;
      
      if (downloadGpx && hasRoute) {
        const stravaData = await downloadFromStrava();
        gpxFileUrl = stravaData.gpx_url;
        coverImageUrl = stravaData.cover_image_url;
        // Use Strava route data if user didn't enter values
        if (!routeDistance && stravaData.distance_km) {
          routeDistance = stravaData.distance_km;
        }
        if (!routeElevation && stravaData.elevation_m) {
          routeElevation = stravaData.elevation_m;
        }
      }

      const { error } = await supabase.from("events").insert({
        title,
        description: description || null,
        event_date: stravaEvent.event_date,
        location: location || "Viz Strava",
        difficulty: difficulty || null,
        terrain_type: terrainType || null,
        distance_km: routeDistance,
        elevation_m: routeElevation,
        strava_event_id: stravaEvent.strava_event_id,
        strava_event_url: stravaEventUrl,
        start_latlng: stravaEvent.start_latlng || null,
        gpx_file_url: gpxFileUrl,
        cover_image_url: coverImageUrl,
        created_by: user.id,
        // Additional Strava fields
        sport_type: stravaEvent.sport_type || null,
        organizing_athlete_name: stravaEvent.organizing_athlete_name || null,
        women_only: false, // Strava doesn't expose this in club events API currently
      });

      if (error) throw error;

      const downloadedItems = [
        gpxFileUrl && "GPX trasa",
        coverImageUrl && "cover image"
      ].filter(Boolean);

      toast.success("Vyjížďka byla importována ze Strava", {
        description: downloadedItems.length > 0
          ? `Automaticky staženo: ${downloadedItems.join(", ")}.`
          : "Nyní můžete přidat cover image, GPX soubor a další detaily.",
      });
      setOpen(false);
      onImported();
    } catch (error: any) {
      console.error("Error importing Strava event:", error);
      toast.error("Nepodařilo se importovat vyjížďku");
    } finally {
      setImporting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset form with Strava values
      setTitle(stravaEvent.title);
      setDescription(stravaEvent.description || "");
      setLocation(stravaEvent.address || "");
      setDifficulty(mapSkillLevel(stravaEvent.skill_level) || "");
      setTerrainType(mapTerrain(stravaEvent.terrain) || "");
      setDistanceKm("");
      setElevationM("");
      setDownloadGpx(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Importovat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importovat vyjížďku ze Strava</DialogTitle>
          <DialogDescription>
            Vytvořit lokální vyjížďku s odkazem na Strava event. Můžete upravit detaily a později přidat cover image a GPX soubor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{stravaEvent.title}</p>
            <p className="text-muted-foreground">
              {format(new Date(stravaEvent.event_date), "EEEE d. MMMM yyyy, HH:mm", { locale: cs })}
            </p>
            {stravaEvent.organizing_athlete_name && (
              <p className="text-muted-foreground">
                Organizuje: {stravaEvent.organizing_athlete_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Název</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Název vyjížďky"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popis vyjížďky"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Místo startu</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Adresa startu"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Vzdálenost (km)</Label>
              <Input
                id="distance"
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="např. 80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elevation">Převýšení (m)</Label>
              <Input
                id="elevation"
                type="number"
                value={elevationM}
                onChange={(e) => setElevationM(e.target.value)}
                placeholder="např. 1200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Obtížnost</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Vybrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Lehká</SelectItem>
                  <SelectItem value="medium">Střední</SelectItem>
                  <SelectItem value="hard">Náročná</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Terén</Label>
              <Select value={terrainType} onValueChange={setTerrainType}>
                <SelectTrigger>
                  <SelectValue placeholder="Vybrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="road">Silnice</SelectItem>
                  <SelectItem value="gravel">Gravel</SelectItem>
                  <SelectItem value="mtb">MTB</SelectItem>
                  <SelectItem value="mixed">Mix</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* GPX Download Option */}
          {hasRoute && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="downloadGpx"
                checked={downloadGpx}
                onCheckedChange={(checked) => setDownloadGpx(checked === true)}
              />
              <div className="grid gap-0.5 leading-none">
                <Label
                  htmlFor="downloadGpx"
                  className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <FileDown className="w-4 h-4" />
                  Stáhnout GPX trasu ze Strava
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automaticky stáhne GPX soubor z připojené trasy
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button onClick={handleImport} disabled={importing || downloadingGpx || !title}>
            {importing || downloadingGpx ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {downloadingGpx ? "Stahuji GPX..." : "Importuji..."}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Importovat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStravaEventDialog;
