import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUp, Loader2, MapPin, Check, AlertCircle, Mountain, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistance, formatElevation } from "@/lib/user-utils";
import { parseGpxFile } from "@/lib/gpx-utils";

interface RouteWithoutGpx {
  id: string;
  title: string;
  distance_km: number | null;
  elevation_m: number | null;
  difficulty: string | null;
  route_link: string | null;
}

export function GpxBulkUploadAdmin() {
  const [routes, setRoutes] = useState<RouteWithoutGpx[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingRouteId, setUploadingRouteId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchRoutesWithoutGpx = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorite_routes")
        .select("id, title, distance_km, elevation_m, difficulty, route_link")
        .is("gpx_file_url", null)
        .order("title", { ascending: true });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("Error fetching routes:", error);
      toast.error("Nepodařilo se načíst trasy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutesWithoutGpx();
  }, []);

  const handleFileUpload = async (routeId: string, file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      toast.error("Nahrajte prosím GPX soubor");
      return;
    }

    setUploadingRouteId(routeId);
    try {
      // Parse GPX to extract stats
      const gpxStats = await parseGpxFile(file);
      
      // Upload file to storage
      const fileName = `${routeId}-${Date.now()}.gpx`;
      const { error: uploadError } = await supabase.storage
        .from("routes")
        .upload(fileName, file, {
          contentType: "application/gpx+xml",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("routes")
        .getPublicUrl(fileName);

      // Update route with GPX URL and optionally parsed stats
      const updateData: Record<string, unknown> = { gpx_file_url: publicUrl };
      
      // Only update distance/elevation if we parsed them and they're not already set
      const route = routes.find(r => r.id === routeId);
      if (gpxStats) {
        if (!route?.distance_km && gpxStats.distanceKm > 0) {
          updateData.distance_km = gpxStats.distanceKm;
        }
        if (!route?.elevation_m && gpxStats.elevationM > 0) {
          updateData.elevation_m = gpxStats.elevationM;
        }
      }

      const { error: updateError } = await supabase
        .from("favorite_routes")
        .update(updateData)
        .eq("id", routeId);

      if (updateError) throw updateError;

      toast.success("GPX soubor byl nahrán");
      
      // Remove route from list
      setRoutes(prev => prev.filter(r => r.id !== routeId));
    } catch (error: any) {
      console.error("Error uploading GPX:", error);
      toast.error(error.message || "Nepodařilo se nahrát GPX");
    } finally {
      setUploadingRouteId(null);
    }
  };

  const handleFileChange = (routeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(routeId, file);
    }
  };

  const triggerFileInput = (routeId: string) => {
    fileInputRefs.current[routeId]?.click();
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    if (!difficulty) return null;
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      easy: "secondary",
      medium: "default",
      hard: "destructive",
    };
    const labels: Record<string, string> = {
      easy: "Lehká",
      medium: "Střední",
      hard: "Těžká",
    };
    return (
      <Badge variant={variants[difficulty] || "secondary"}>
        {labels[difficulty] || difficulty}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Trasy bez GPX dat
          </div>
          <Badge variant="outline" className="text-base">
            {routes.length} tras
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Check className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Všechny trasy mají GPX</h3>
            <p className="text-muted-foreground">
              Žádné trasy nečekají na nahrání GPX souboru.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Následující trasy nemají přiřazený GPX soubor. Nahrajte GPX pro zobrazení mapy a výškového profilu.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trasa</TableHead>
                    <TableHead>Vzdálenost</TableHead>
                    <TableHead>Převýšení</TableHead>
                    <TableHead>Obtížnost</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <RouteIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium">{route.title}</span>
                            {route.route_link && (
                              <a
                                href={route.route_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate max-w-[200px]"
                              >
                                Zdroj
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {route.distance_km ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {formatDistance(route.distance_km)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {route.elevation_m ? (
                          <div className="flex items-center gap-1">
                            <Mountain className="w-3 h-3 text-muted-foreground" />
                            {formatElevation(route.elevation_m)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getDifficultyBadge(route.difficulty)}
                      </TableCell>
                      <TableCell className="text-right">
                        <input
                          type="file"
                          accept=".gpx"
                          className="hidden"
                          ref={(el) => {
                            fileInputRefs.current[route.id] = el;
                          }}
                          onChange={(e) => handleFileChange(route.id, e)}
                        />
                        <Button
                          size="sm"
                          onClick={() => triggerFileInput(route.id)}
                          disabled={uploadingRouteId === route.id}
                        >
                          {uploadingRouteId === route.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <FileUp className="w-4 h-4 mr-2" />
                          )}
                          Nahrát GPX
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
