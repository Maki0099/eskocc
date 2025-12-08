import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StravaConnectPromptProps {
  userId: string;
  hasStrava: boolean;
}

const StravaConnectPrompt = ({ userId, hasStrava }: StravaConnectPromptProps) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pending = localStorage.getItem("stravaConnectPending");
    if (pending === "true" && !hasStrava) {
      setShowPrompt(true);
    }
  }, [hasStrava]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("strava-auth", {
        body: { userId },
      });

      if (error) throw error;
      if (data?.url) {
        localStorage.removeItem("stravaConnectPending");
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Strava auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.removeItem("stravaConnectPending");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Card className="border-[#FC4C02]/20 bg-[#FC4C02]/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FC4C02]/10 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-[#FC4C02]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1">Dokonči propojení Stravy</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Při registraci jsi zvolil/a propojení se Stravou. Propoj svůj účet a tvé kilometry se budou automaticky započítávat.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={loading}
                className="bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white"
              >
                <Activity className="w-3 h-3 mr-1" />
                {loading ? "Připojování..." : "Propojit"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-muted-foreground"
              >
                Později
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StravaConnectPrompt;
