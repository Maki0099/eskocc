import { createContext, useContext, useEffect, useState, useMemo } from "react";
import SunCalc from "suncalc";

type Theme = "dark" | "light" | "auto";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type SunTimes = {
  sunrise: Date;
  sunset: Date;
};

type ThemeProviderState = {
  theme: Theme;
  effectiveTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  sunTimes: SunTimes | null;
};

const initialState: ThemeProviderState = {
  theme: "auto",
  effectiveTheme: "light",
  setTheme: () => null,
  sunTimes: null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Karolinka coordinates (default location)
const DEFAULT_LAT = 49.35;
const DEFAULT_LNG = 18.02;

function getSunTimes(lat: number, lng: number): SunTimes {
  const times = SunCalc.getTimes(new Date(), lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
  };
}

function isDaytime(sunTimes: SunTimes): boolean {
  const now = new Date();
  return now >= sunTimes.sunrise && now < sunTimes.sunset;
}

export function ThemeProvider({
  children,
  defaultTheme = "auto",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    // Migrate "system" to "auto" for existing users
    if (stored === "system") {
      localStorage.setItem(storageKey, "auto");
      return "auto";
    }
    return (stored as Theme) || defaultTheme;
  });

  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [effectiveTheme, setEffectiveTheme] = useState<"dark" | "light">("light");

  // Calculate sun times on mount and when date changes
  useEffect(() => {
    const calculateSunTimes = () => {
      const times = getSunTimes(DEFAULT_LAT, DEFAULT_LNG);
      setSunTimes(times);
    };

    calculateSunTimes();

    // Recalculate at midnight for new day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => {
      calculateSunTimes();
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  // Determine effective theme and apply to DOM
  useEffect(() => {
    const root = window.document.documentElement;

    const updateTheme = () => {
      let resolvedTheme: "dark" | "light";

      if (theme === "auto" && sunTimes) {
        resolvedTheme = isDaytime(sunTimes) ? "light" : "dark";
      } else if (theme === "auto") {
        // Fallback to system preference if sun times not yet calculated
        resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else {
        resolvedTheme = theme;
      }

      setEffectiveTheme(resolvedTheme);
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    };

    updateTheme();

    // Check every minute for auto mode
    let interval: NodeJS.Timeout | null = null;
    if (theme === "auto") {
      interval = setInterval(updateTheme, 60000); // Check every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [theme, sunTimes]);

  const value = useMemo(
    () => ({
      theme,
      effectiveTheme,
      sunTimes,
      setTheme: (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        setThemeState(newTheme);
      },
    }),
    [theme, effectiveTheme, sunTimes, storageKey]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
