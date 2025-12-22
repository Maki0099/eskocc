import { getRouteSourceInfo } from "@/lib/route-source-utils";
import { ExternalLink, Globe } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RouteSourceIconProps {
  url: string | null | undefined;
  showLabel?: boolean;
  className?: string;
}

export function RouteSourceIcon({ url, showLabel = false, className }: RouteSourceIconProps) {
  if (!url) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const sourceInfo = getRouteSourceInfo(url);
  
  if (!sourceInfo) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors", className)}
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="w-4 h-4" />
              {showLabel && <span className="text-xs">Odkaz</span>}
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-[300px] truncate text-xs">{url}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const Icon = sourceInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1.5 transition-colors hover:opacity-80",
              sourceInfo.color,
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="w-4 h-4" />
            {showLabel && <span className="text-xs font-medium">{sourceInfo.name}</span>}
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[350px]">
          <div className="space-y-1">
            <p className="font-medium text-xs">{sourceInfo.name}</p>
            {sourceInfo.description && (
              <p className="text-xs text-muted-foreground">{sourceInfo.description}</p>
            )}
            <p className="text-xs truncate opacity-70">{url}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
