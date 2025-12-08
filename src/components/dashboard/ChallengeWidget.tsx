import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, ChevronRight, Loader2, AlertCircle, PartyPopper } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationShownRef = useRef(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile to check Strava connection and get birth date
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("birth_date, strava_id")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        const hasStrava = !!profile?.strava_id;
        setIsConnected(hasStrava);

        // Calculate age from birth_date
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

        // Fetch challenge settings for current year
        const { data: settings, error: settingsError } = await supabase
          .from("yearly_challenge_settings")
          .select("*")
          .eq("year", currentYear)
          .maybeSingle();

        if (settingsError) throw settingsError;

        if (settings) {
          // Cast settings since types might not be updated yet
          const typedSettings = settings as ChallengeSettings;
          
          // Determine target based on age
          let userTarget = typedSettings.target_under_40; // default
          if (userAge !== null) {
            if (userAge >= 60) {
              userTarget = typedSettings.target_over_60;
            } else if (userAge >= 40) {
              userTarget = typedSettings.target_under_60;
            } else {
              userTarget = typedSettings.target_under_40;
            }
          }
          setTarget(userTarget);
        }

        // Fetch YTD distance from Strava
        if (hasStrava) {
          const { data: statsData, error: statsError } = await supabase.functions.invoke(
            "strava-stats",
            { body: { userId } }
          );

          if (statsError) {
            console.error("Error fetching Strava stats:", statsError);
            setError("Nepodařilo se načíst data ze Stravy");
          } else if (statsData?.ytd_ride_totals) {
            // Convert meters to km
            setYtdDistance(Math.round(statsData.ytd_ride_totals.distance / 1000));
          }
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

  // Update target when userAge changes
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return null; // Don't show widget if Strava is not connected
  }

  const progress = target > 0 ? Math.min((ytdDistance / target) * 100, 100) : 0;
  const remaining = Math.max(target - ytdDistance, 0);
  const isCompleted = ytdDistance >= target && target > 0;

  // Show celebration notification when goal is completed
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
              to="/statistiky" 
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
