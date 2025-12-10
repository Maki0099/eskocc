import { Link } from "react-router-dom";
import { Route, Mountain, Gauge, MoreVertical, Download, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRouteDetailPath } from "@/lib/routes";

interface FavoriteRoute {
  id: string;
  title: string;
  description: string | null;
  distance_km: number | null;
  elevation_m: number | null;
  difficulty: string | null;
  terrain_type: string | null;
  route_link: string | null;
  gpx_file_url: string | null;
  cover_image_url: string | null;
  created_by: string | null;
}

interface RouteListItemProps {
  route: FavoriteRoute;
  canEdit: boolean;
  onEdit: (route: FavoriteRoute) => void;
  onDelete: (route: FavoriteRoute) => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Lehká",
  medium: "Střední",
  hard: "Náročná",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500/10 text-green-600 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-600 border-red-500/20",
};

const TERRAIN_ICONS: Record<string, string> = {
  road: "🛤️",
  gravel: "🏔️",
  mtb: "🚵",
  mixed: "🚴",
};

const RouteListItem = ({ route, canEdit, onEdit, onDelete }: RouteListItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      <Link 
        to={getRouteDetailPath(route.id)} 
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        {/* Terrain Icon */}
        <span className="text-xl shrink-0">
          {route.terrain_type ? TERRAIN_ICONS[route.terrain_type] || "🚴" : "🚴"}
        </span>

        {/* Title */}
        <span className="font-medium truncate group-hover:text-primary transition-colors">
          {route.title}
        </span>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
          {route.distance_km && (
            <span className="flex items-center gap-1">
              <Route className="w-3.5 h-3.5" />
              {route.distance_km} km
            </span>
          )}
          {route.elevation_m && (
            <span className="flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5" />
              {route.elevation_m} m
            </span>
          )}
        </div>

        {/* Difficulty Badge */}
        {route.difficulty && (
          <Badge 
            variant="outline" 
            className={`hidden md:flex gap-1 text-xs shrink-0 ${DIFFICULTY_COLORS[route.difficulty] || ""}`}
          >
            <Gauge className="w-3 h-3" />
            {DIFFICULTY_LABELS[route.difficulty] || route.difficulty}
          </Badge>
        )}
      </Link>

      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={getRouteDetailPath(route.id)} className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Detail trasy
            </Link>
          </DropdownMenuItem>
          {route.gpx_file_url && (
            <DropdownMenuItem asChild>
              <a 
                href={route.gpx_file_url} 
                download 
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Stáhnout GPX
              </a>
            </DropdownMenuItem>
          )}
          {route.route_link && (
            <DropdownMenuItem asChild>
              <a 
                href={route.route_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Otevřít v mapách
              </a>
            </DropdownMenuItem>
          )}
          {canEdit && (
            <>
              <DropdownMenuItem 
                onClick={() => onEdit(route)}
                className="flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Upravit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(route)}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Smazat
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RouteListItem;
