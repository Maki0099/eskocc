import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import Seo from "@/components/Seo";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MemberOnlyContent from "@/components/MemberOnlyContent";
import GpxMap from "@/components/map/GpxMap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ArrowRight, Bike, Download, ExternalLink, Info, Mountain } from "lucide-react";
import {
  DIFFICULTY_LABEL, TERRAIN_LABEL, campFileUrl, downloadFile, type CampPhoto,
} from "@/lib/camp-routes";
import { ROUTES, getCampRoutePath } from "@/lib/routes";
import { useCampRoutes } from "./CampRoutes";

const CampRouteDetail = () => {
  const { slug } = useParams();
  const { isMember, loading: roleLoading } = useUserRole();
  const { data: routes = [], isLoading } = useCampRoutes(isMember);
  const idx = routes.findIndex((r) => r.slug === slug);
  const route = idx >= 0 ? routes[idx] : undefined;
  const [active, setActive] = useState<string | null>(null);

  const { data: photos = [] } = useQuery({
    queryKey: ["camp-photos", route?.id],
    enabled: !!route,
    queryFn: async () => {
      const { data } = await supabase.from("camp_route_photos").select("*")
        .eq("route_id", route!.id).order("sort_order").order("created_at");
      return (data ?? []) as CampPhoto[];
    },
  });

  useEffect(() => { setActive(null); window.scrollTo(0, 0); }, [slug]);

  const hero = active ?? route?.cover_image_url ?? photos[0]?.file_url;
  const prev = idx > 0 ? routes[idx - 1] : null;
  const next = idx >= 0 && idx < routes.length - 1 ? routes[idx + 1] : null;
  const gpxUrl = route ? campFileUrl(route.gpx_path, route.updated_at) : "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo title={`${route?.title ?? "Trasa"} | Mallorca | ESKO.cc`} description="Trasa soustředění na Mallorce." path={`/mallorca/${slug}`} noindex />
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link to={ROUTES.CAMP} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />Všechny trasy Mallorca
          </Link>

          {!isMember && !roleLoading ? (
            <MemberOnlyContent title="Trasa pro členy" description="Trasy soustředění jsou dostupné jen členům klubu." />
          ) : isLoading || roleLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : !route ? (
            <p className="text-center text-muted-foreground py-12">Trasa nenalezena.</p>
          ) : (
            <>
              <div className="space-y-3">
                {hero && (
                  <img src={hero} alt={route.title} className="w-full aspect-[16/9] object-cover rounded-xl" />
                )}
                {photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {photos.map((p) => (
                      <button key={p.id} onClick={() => setActive(p.file_url)} className={`shrink-0 rounded ${hero === p.file_url ? "ring-2 ring-primary" : ""}`}>
                        <img src={p.file_url} alt={p.caption ?? ""} className="w-24 h-16 object-cover rounded" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {route.camp_day && <p className="text-sm text-primary font-medium">Den {route.camp_day}</p>}
                <h1 className="text-3xl font-bold">{route.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Bike className="w-4 h-4" />{route.distance_km} km</span>
                  <span className="flex items-center gap-1"><Mountain className="w-4 h-4" />{route.elevation_m} m</span>
                  <span>{DIFFICULTY_LABEL[route.difficulty]}</span>
                  <span>{TERRAIN_LABEL[route.terrain]}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="gap-2" onClick={() => downloadFile(gpxUrl, `${route.slug}.gpx`)}>
                  <Download className="w-4 h-4" />Stáhnout GPX
                </Button>
                {route.mapy_url && (
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={route.mapy_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" />Otevřít v Mapy.cz</a>
                  </Button>
                )}
              </div>

              {route.description && (
                <div className="text-base leading-relaxed whitespace-pre-line">{route.description}</div>
              )}

              <div className="rounded-xl overflow-hidden border border-border">
                <GpxMap gpxUrl={gpxUrl} showElevationProfile />
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2"><Info className="w-4 h-4" />Jak dostat trasu do Garminu?</Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ol className="text-sm text-muted-foreground space-y-1 pl-5 list-decimal mt-2">
                    <li>Klikni na <strong>Stáhnout GPX</strong>.</li>
                    <li>V Garmin Connect otevři <strong>Tréninky a plánování → Trasy → Importovat</strong>.</li>
                    <li>U trasy zvol <strong>Odeslat do zařízení</strong>.</li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-between gap-2 pt-4 border-t border-border">
                {prev ? (
                  <Button variant="ghost" asChild><Link to={getCampRoutePath(prev.slug)} className="gap-2"><ArrowLeft className="w-4 h-4" />{prev.title}</Link></Button>
                ) : <span />}
                {next && (
                  <Button variant="ghost" asChild><Link to={getCampRoutePath(next.slug)} className="gap-2">{next.title}<ArrowRight className="w-4 h-4" /></Link></Button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CampRouteDetail;
