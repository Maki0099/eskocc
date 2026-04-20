import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/routes";
import { ChallengeWidgetSkeleton } from "@/components/dashboard/DashboardSkeletons";

interface ChallengeWidgetProps {
  userId: string;
}

interface ChallengeSettings {
  year: number;
  target_under_40: number;
  target_under_60: number;
  target_over_60: number;
}

export const ChallengeWidget = ({ userId }: ChallengeWidgetProps) => {
  const [loading, setLoading] = useState(true);
  const [ytdDistance, setYtdDistance] = useState<number>(0);
  const [target, setTarget] = useState<number>(0);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notificationShownRef = useRef(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("birth_date, strava_ytd_distance")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.birth_date) {
          const birthDate = new Date(profile.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          setUserAge(age);
        }

        // YTD distance is now stored on profile (km), populated by club sync.
        // Strava stores meters in club_activities; profiles.strava_ytd_distance is in km after sync.
        setYtdDistance(profile?.strava_ytd_distance ?? 0);

        const { data: settings, error: settingsError } = await supabase
          .from("yearly_challenge_settings")
          .select("*")
          .eq("year", currentYear)
          .maybeSingle();

        if (settingsError) throw settingsError;

        if (settings) {
          const typedSettings = settings as ChallengeSettings;
          let userTarget = typedSettings.target_under_40;
          if (userAge !== null) {
            if (userAge >= 60) {
              userTarget = typedSettings.target_over_60;
            } else if (userAge >= 40) {
              userTarget = typedSettings.target_under_60;
            }
          }
          setTarget(userTarget);
        }
      } catch (err) {
        console.error("Error in ChallengeWidget:", err);
        setError("Nepodařilo se načíst data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, currentYear, userAge]);

  useEffect(() => {
    const updateTarget = async () => {
      if (userAge === null) return;

      const { data: settings } = await supabase
        .from("yearly_challenge_settings")
        .select("*")
        .eq("year", currentYear)
        .maybeSingle();

      if (settings) {
        const typedSettings = settings as ChallengeSettings;
        let userTarget = typedSettings.target_under_40;
        if (userAge >= 60) {
          userTarget = typedSettings.target_over_60;
        } else if (userAge >= 40) {
          userTarget = typedSettings.target_under_60;
        }
        setTarget(userTarget);
      }
    };

    updateTarget();
  }, [userAge, currentYear]);

  const progress = target > 0 ? Math.min((ytdDistance / target) * 100, 100) : 0;
  const remaining = Math.max(target - ytdDistance, 0);
  const isCompleted = ytdDistance >= target && target > 0;

  useEffect(() => {
    if (isCompleted && !notificationShownRef.current && !loading) {
      const storageKey = `challenge_completed_${currentYear}_${userId}`;
      const alreadyNotified = localStorage.getItem(storageKey);

      if (!alreadyNotified) {
        localStorage.setItem(storageKey, "true");
        toast({
          title: "🎉 Gratulujeme!",
          description: `Splnil jsi svůj cíl ${target.toLocaleString()} km pro rok ${currentYear}!`,
        });
      }
      notificationShownRef.current = true;
    }
  }, [isCompleted, loading, currentYear, userId, target]);

  if (loading) {
    return <ChallengeWidgetSkeleton />;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          Výzva {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tvůj cíl:</span>
                <span className="font-medium">{target.toLocaleString()} km</span>
              </div>
              <Progress
                value={progress}
                className={`h-2 ${isCompleted ? '[&>div]:bg-green-500' : ''}`}
              />
              <div className="flex justify-between text-sm">
                <span className={isCompleted ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                  {isCompleted ? "✓ Splněno!" : `Najeto: ${ytdDistance.toLocaleString()} km`}
                </span>
                <span className="text-muted-foreground">
                  {isCompleted
                    ? `${Math.round(progress)}%`
                    : `Zbývá: ${remaining.toLocaleString()} km`
                  }
                </span>
              </div>
            </div>

            <Link
              to={ROUTES.STATISTICS}
              className="flex items-center justify-between text-sm text-primary hover:underline"
            >
              <span>Zobrazit celkové statistiky</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
};
