import { cn } from "@/lib/utils";

interface RegistrationStepsProps {
  currentStep: number;
  totalSteps: number;
}

const RegistrationSteps = ({ currentStep, totalSteps }: RegistrationStepsProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index + 1 === currentStep
              ? "w-8 bg-primary"
              : index + 1 < currentStep
              ? "w-4 bg-primary/60"
              : "w-4 bg-muted"
          )}
        />
      ))}
    </div>
  );
};

export default RegistrationSteps;
