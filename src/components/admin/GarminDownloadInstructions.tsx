import { ExternalLink, Download, Copy, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

interface GarminDownloadInstructionsProps {
  courseUrl: string;
  onGpxUpload?: (file: File) => void;
}

export function GarminDownloadInstructions({
  courseUrl,
  onGpxUpload,
}: GarminDownloadInstructionsProps) {
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(courseUrl);
    toast.success("URL zkopírována do schránky");
  };

  // Extract course ID from URL for direct link
  const courseIdMatch = courseUrl.match(/course\/(\d+)/);
  const courseId = courseIdMatch?.[1];

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-500/10">
          <Download className="w-4 h-4" />
          Jak stáhnout GPX?
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Badge className="bg-cyan-600 text-white mt-0.5">Garmin</Badge>
            <div className="flex-1">
              <p className="font-medium text-sm mb-2">
                Garmin Connect vyžaduje přihlášení pro stažení GPX
              </p>
              <p className="text-xs text-muted-foreground">
                Postupujte podle těchto kroků:
              </p>
            </div>
          </div>

          <ol className="space-y-3 text-sm pl-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-medium">
                1
              </span>
              <div className="flex-1">
                <p>Otevřete kurz v Garmin Connect:</p>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={courseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                  >
                    Otevřít v Garmin Connect
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="h-6 px-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-medium">
                2
              </span>
              <span>Přihlaste se do svého Garmin účtu</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-medium">
                3
              </span>
              <div className="flex-1">
                <p>Klikněte na ikonu <strong>ozubeného kolečka</strong> (⚙️) vpravo nahoře</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Najdete ji vedle názvu kurzu
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-medium">
                4
              </span>
              <span>Vyberte <strong>"Export to GPX"</strong> nebo <strong>"Exportovat do GPX"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-medium">
                5
              </span>
              <div className="flex-1 flex items-center gap-2">
                <span>Nahrajte stažený GPX soubor:</span>
                {onGpxUpload && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".gpx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onGpxUpload(file);
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" asChild className="gap-1">
                      <span>
                        <FileUp className="w-3 h-3" />
                        Nahrát GPX
                      </span>
                    </Button>
                  </label>
                )}
              </div>
            </li>
          </ol>

          {courseId && (
            <div className="pt-3 border-t border-cyan-500/20">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Pokud máte Garmin účet propojený s touto trasou,
                můžete GPX soubor nalézt také v aplikaci Garmin Connect Mobile.
              </p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
