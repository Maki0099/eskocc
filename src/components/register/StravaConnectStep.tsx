import { Button } from "@/components/ui/button";
import { Activity, ArrowRight } from "lucide-react";

interface StravaConnectStepProps {
  onConnect: () => void;
  onSkip: () => void;
}

const StravaConnectStep = ({ onConnect, onSkip }: StravaConnectStepProps) => {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-[#FC4C02]/10 flex items-center justify-center">
        <Activity className="w-8 h-8 text-[#FC4C02]" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Propoj svůj Strava účet</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Propojením Stravy se tvé kilometry automaticky započítávají do klubové statistiky a výzvy roku.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          onClick={onConnect}
          className="w-full h-12 bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white"
        >
          <Activity className="w-4 h-4 mr-2" />
          Propojit po registraci
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          className="w-full h-12 text-muted-foreground hover:text-foreground"
        >
          Přeskočit tento krok
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Strava propojení můžeš kdykoliv nastavit později v nastavení účtu.
      </p>
    </div>
  );
};

export default StravaConnectStep;
