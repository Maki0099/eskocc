import { Moon, Sun, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme, sunTimes } = useTheme();

  const cycleTheme = () => {
    if (theme === "auto") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("auto");
    }
  };

  const getTooltipText = () => {
    if (theme === "auto" && sunTimes) {
      const now = new Date();
      const isDay = effectiveTheme === "light";
      const nextSwitch = isDay ? sunTimes.sunset : sunTimes.sunrise;
      const timeStr = nextSwitch.toLocaleTimeString("cs-CZ", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Auto režim (${isDay ? "západ" : "východ"} v ${timeStr})`;
    }
    if (theme === "auto") return "Auto režim";
    if (theme === "light") return "Světlý režim";
    return "Tmavý režim";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          className="h-9 w-9 rounded-lg"
          aria-label="Přepnout režim zobrazení"
        >
          {theme === "auto" ? (
            <Sunrise className="h-4 w-4" />
          ) : theme === "light" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
