import { CheckCircle, Globe, Upload, ClipboardCheck, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type WizardStep = "source" | "url" | "gpx-upload" | "gpx-mode" | "gpx-preview" | "select" | "mode" | "review" | "summary";

interface ImportStepperProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  importSource?: "url" | "gpx";
}

interface StepDef {
  id: string;
  label: string;
  icon: React.ElementType;
  matchSteps: WizardStep[];
}

const URL_STEPS: StepDef[] = [
  { id: "source", label: "Zdroj", icon: Globe, matchSteps: ["source", "url"] },
  { id: "select", label: "Výběr", icon: ClipboardCheck, matchSteps: ["select"] },
  { id: "review", label: "Kontrola", icon: ClipboardCheck, matchSteps: ["mode", "review"] },
  { id: "import", label: "Import", icon: Download, matchSteps: ["summary"] },
];

const GPX_STEPS: StepDef[] = [
  { id: "source", label: "Zdroj", icon: Upload, matchSteps: ["source", "gpx-upload"] },
  { id: "mode", label: "Nastavení", icon: ClipboardCheck, matchSteps: ["gpx-mode"] },
  { id: "preview", label: "Kontrola", icon: ClipboardCheck, matchSteps: ["gpx-preview", "review"] },
  { id: "import", label: "Import", icon: Download, matchSteps: ["summary"] },
];

function getStepIndex(step: WizardStep, steps: StepDef[]): number {
  return steps.findIndex(s => s.matchSteps.includes(step));
}

export function ImportStepper({ currentStep, onStepClick, importSource = "url" }: ImportStepperProps) {
  const steps = importSource === "gpx" ? GPX_STEPS : URL_STEPS;
  const currentIndex = getStepIndex(currentStep, steps);

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((stepDef, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isClickable = isCompleted && onStepClick;

        const Icon = isCompleted ? CheckCircle : stepDef.icon;

        return (
          <div key={stepDef.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => isClickable && onStepClick?.(stepDef.matchSteps[0])}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isClickable && "cursor-pointer hover:opacity-80",
                !isClickable && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive && "text-primary",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {stepDef.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  index < currentIndex ? "bg-green-500" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
