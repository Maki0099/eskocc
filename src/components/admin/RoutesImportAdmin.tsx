import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, 
  Download, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Route,
  FileUp,
  ChevronDown,
  Bike,
  Map,
  Mountain,
  MapPin,
  Compass,
  Watch,
  TreePine,
  Scan,
  ExternalLink
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type GpxStatus = 'available' | 'auth-required' | 'premium' | 'varies' | 'detection';

interface SupportedService {
  id: string;
  name: string;
  icon: React.ElementType;
  url: string;
  gpxStatus: GpxStatus;
  description: string;
}

const SUPPORTED_SERVICES: SupportedService[] = [
  {
    id: 'bicycle-holiday',
    name: 'bicycle.holiday',
    icon: Bike,
    url: 'https://bicycle.holiday',
    gpxStatus: 'available',
    description: 'České cyklotrasy'
  },
  {
    id: 'ridewithgps',
    name: 'RideWithGPS',
    icon: Route,
    url: 'https://ridewithgps.com',
    gpxStatus: 'auth-required',
    description: 'Plánovač tras'
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: Mountain,
    url: 'https://strava.com',
    gpxStatus: 'auth-required',
    description: 'Trasy a segmenty'
  },
  {
    id: 'komoot',
    name: 'Komoot',
    icon: Compass,
    url: 'https://komoot.com',
    gpxStatus: 'auth-required',
    description: 'Plánování túr'
  },
  {
    id: 'mapy-cz',
    name: 'Mapy.cz',
    icon: MapPin,
    url: 'https://mapy.cz',
    gpxStatus: 'varies',
    description: 'České mapy'
  },
  {
    id: 'wikiloc',
    name: 'Wikiloc',
    icon: Map,
    url: 'https://wikiloc.com',
    gpxStatus: 'premium',
    description: 'Světové stezky'
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: Watch,
    url: 'https://connect.garmin.com',
    gpxStatus: 'auth-required',
    description: 'Garmin kurzy'
  },
  {
    id: 'alltrails',
    name: 'AllTrails',
    icon: TreePine,
    url: 'https://alltrails.com',
    gpxStatus: 'premium',
    description: 'Turistické stezky'
  },
  {
    id: 'trailforks',
    name: 'Trailforks',
    icon: Mountain,
    url: 'https://trailforks.com',
    gpxStatus: 'premium',
    description: 'MTB stezky'
  },
  {
    id: 'generic',
    name: 'Ostatní',
    icon: Scan,
    url: '',
    gpxStatus: 'detection',
    description: 'Auto-detekce embedů'
  }
];

const getGpxStatusBadge = (status: GpxStatus) => {
  switch (status) {
    case 'available':
      return <Badge variant="default" className="bg-green-600 text-xs">GPX dostupný</Badge>;
    case 'auth-required':
      return <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-600 text-xs">Vyžaduje přihlášení</Badge>;
    case 'premium':
      return <Badge variant="secondary" className="bg-orange-600/20 text-orange-600 text-xs">Premium účet</Badge>;
    case 'varies':
      return <Badge variant="secondary" className="bg-blue-600/20 text-blue-600 text-xs">Závisí na URL</Badge>;
    case 'detection':
      return <Badge variant="outline" className="text-xs">Auto-detekce</Badge>;
  }
};

interface ParsedRoute {
  id: string;
  title: string;
  description?: string;
  distance_km?: number;
  elevation_m?: number;
  gpx_url?: string;
  gpx_accessible: boolean;
  cover_url?: string;
  route_link?: string;
  // Local state for manual upload
  manualGpxFile?: File;
  manualGpxBase64?: string;
}

type ImportState = 'idle' | 'analyzing' | 'preview' | 'importing' | 'complete';

export function RoutesImportAdmin() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ImportState>('idle');
  const [routes, setRoutes] = useState<ParsedRoute[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<{
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [servicesOpen, setServicesOpen] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error("Zadejte URL stránky s trasami");
      return;
    }

    setState('analyzing');
    setRoutes([]);
    setSelectedIds(new Set());
    setImportResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-routes-page', {
        body: { url: url.trim() }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Analýza selhala');
      }

      if (data.routes.length === 0) {
        toast.warning("Na stránce nebyly nalezeny žádné trasy");
        setState('idle');
        return;
      }

      setRoutes(data.routes);
      // Pre-select all routes with accessible GPX
      const accessibleIds = new Set<string>(
        data.routes
          .filter((r: ParsedRoute) => r.gpx_accessible || r.gpx_url)
          .map((r: ParsedRoute) => r.id)
      );
      setSelectedIds(accessibleIds);
      setState('preview');
      toast.success(`Nalezeno ${data.routes.length} tras`);

    } catch (error: any) {
      console.error("Error analyzing URL:", error);
      toast.error(error.message || "Nepodařilo se analyzovat stránku");
      setState('idle');
    }
  };

  const handleFileUpload = async (routeId: string, file: File) => {
    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setRoutes(prev => prev.map(r => 
        r.id === routeId 
          ? { ...r, manualGpxFile: file, manualGpxBase64: base64 }
          : r
      ));
      // Auto-select route when GPX is uploaded
      setSelectedIds(prev => new Set([...prev, routeId]));
      toast.success(`GPX soubor "${file.name}" nahrán`);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(routes.map(r => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = async () => {
    const selectedRoutes = routes.filter(r => selectedIds.has(r.id));
    
    if (selectedRoutes.length === 0) {
      toast.error("Vyberte alespoň jednu trasu k importu");
      return;
    }

    setState('importing');

    try {
      const routesToImport = selectedRoutes.map(r => ({
        title: r.title,
        description: r.description,
        distance_km: r.distance_km,
        elevation_m: r.elevation_m,
        gpx_url: r.gpx_accessible ? r.gpx_url : undefined,
        gpx_base64: r.manualGpxBase64,
        gpx_filename: r.manualGpxFile?.name,
        cover_url: r.cover_url,
        route_link: r.route_link
      }));

      const { data, error } = await supabase.functions.invoke('import-selected-routes', {
        body: { routes: routesToImport }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Import selhal');
      }

      setImportResults({
        imported: data.imported,
        skipped: data.skipped,
        errors: data.errors
      });
      setState('complete');
      toast.success(`Import dokončen: ${data.imported} tras importováno`);

    } catch (error: any) {
      console.error("Error importing routes:", error);
      toast.error(error.message || "Nepodařilo se importovat trasy");
      setState('preview');
    }
  };

  const handleReset = () => {
    setUrl("");
    setRoutes([]);
    setSelectedIds(new Set());
    setImportResults(null);
    setState('idle');
  };

  const getGpxStatusIcon = (route: ParsedRoute) => {
    if (route.manualGpxFile) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (route.gpx_accessible) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (route.gpx_url) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const getGpxStatusText = (route: ParsedRoute) => {
    if (route.manualGpxFile) {
      return route.manualGpxFile.name;
    }
    if (route.gpx_accessible) {
      return "Dostupný";
    }
    if (route.gpx_url) {
      return "Vyžaduje auth";
    }
    return "Nenalezen";
  };

  const routesWithoutGpx = routes.filter(r => !r.gpx_accessible && !r.manualGpxFile);
  const selectedCount = selectedIds.size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="w-5 h-5" />
          Import tras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Supported Services */}
        <Collapsible open={servicesOpen} onOpenChange={setServicesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
              <span className="text-sm font-medium">
                Podporované služby ({SUPPORTED_SERVICES.length})
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
              {SUPPORTED_SERVICES.map((service) => (
                <div 
                  key={service.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <service.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {service.url ? (
                        <a 
                          href={service.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-primary flex items-center gap-1"
                        >
                          {service.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-medium text-sm">{service.name}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {getGpxStatusBadge(service.gpxStatus)}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* URL Input */}
        <div className="flex gap-2">
          <Input
            placeholder="https://bicycle.holiday/cs/trasy-a-vylety/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={state !== 'idle'}
            className="flex-1"
          />
          <Button 
            onClick={handleAnalyze} 
            disabled={state !== 'idle' || !url.trim()}
            className="gap-2"
          >
            {state === 'analyzing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzuji...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyzovat
              </>
            )}
          </Button>
        </div>

        {/* Preview Table */}
        {state === 'preview' && routes.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Nalezené trasy ({routes.length})
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Vybrat vše
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Zrušit výběr
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 w-10"></th>
                      <th className="p-2 text-left">Název</th>
                      <th className="p-2 text-right w-20">km</th>
                      <th className="p-2 text-right w-20">m</th>
                      <th className="p-2 w-32">GPX</th>
                      <th className="p-2 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr 
                        key={route.id} 
                        className={`border-t hover:bg-muted/30 ${
                          selectedIds.has(route.id) ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={selectedIds.has(route.id)}
                            onCheckedChange={() => handleToggleSelect(route.id)}
                          />
                        </td>
                        <td className="p-2">
                          <div className="font-medium truncate max-w-[300px]" title={route.title}>
                            {route.title}
                          </div>
                          {route.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {route.description}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {route.distance_km ? `${route.distance_km}` : '-'}
                        </td>
                        <td className="p-2 text-right">
                          {route.elevation_m ? `${route.elevation_m}` : '-'}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {getGpxStatusIcon(route)}
                            <span className="text-xs truncate max-w-[80px]" title={getGpxStatusText(route)}>
                              {getGpxStatusText(route)}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          {!route.gpx_accessible && !route.manualGpxFile && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept=".gpx"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(route.id, file);
                                }}
                              />
                              <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                                <FileUp className="w-3 h-3" />
                                GPX
                              </Badge>
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warning for routes without GPX */}
            {routesWithoutGpx.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p>
                  {routesWithoutGpx.length} tras nemá dostupný GPX soubor. 
                  Můžete nahrát GPX ručně kliknutím na tlačítko "GPX" u dané trasy.
                </p>
              </div>
            )}

            {/* Import Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm">
                Vybráno: <strong>{selectedCount}</strong> tras
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Zrušit
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={selectedCount === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Importovat vybrané
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Importing State */}
        {state === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Importuji {selectedCount} tras...</p>
          </div>
        )}

        {/* Complete State */}
        {state === 'complete' && importResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Import dokončen</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                <div className="text-sm text-muted-foreground">Importováno</div>
              </div>
              <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                <div className="text-sm text-muted-foreground">Přeskočeno</div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-destructive">{importResults.errors}</div>
                <div className="text-sm text-muted-foreground">Chyby</div>
              </div>
            </div>

            <Button onClick={handleReset} className="w-full">
              Nový import
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
