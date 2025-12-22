import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, Mountain, Route } from "lucide-react";
import { EditableRoute } from "./RouteReviewCard";

interface BulkSettingsDropdownProps {
  selectedRoutes: EditableRoute[];
  onUpdateRoutes: (updates: Partial<EditableRoute>) => void;
}

const TERRAIN_OPTIONS = [
  { value: "road", label: "Silnice" },
  { value: "gravel", label: "Gravel" },
  { value: "mtb", label: "MTB" },
  { value: "mixed", label: "Kombinovaný" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Lehká" },
  { value: "medium", label: "Střední" },
  { value: "hard", label: "Těžká" },
];

export function BulkSettingsDropdown({ selectedRoutes, onUpdateRoutes }: BulkSettingsDropdownProps) {
  if (selectedRoutes.length === 0) {
    return null;
  }

  const handleTerrainChange = (terrain: string) => {
    onUpdateRoutes({ terrain_type: terrain });
  };

  const handleDifficultyChange = (difficulty: string) => {
    onUpdateRoutes({ difficulty });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Hromadné nastavení
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Nastavit pro {selectedRoutes.length} tras
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Terrain submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Route className="w-4 h-4 mr-2" />
            Terén
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {TERRAIN_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleTerrainChange(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Difficulty submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Mountain className="w-4 h-4 mr-2" />
            Obtížnost
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {DIFFICULTY_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleDifficultyChange(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
