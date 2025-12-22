import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTheme } from "@/components/ThemeProvider";
import { TourId, useTour } from "@/hooks/useTour";
import { 
  indexSteps,
  dashboardSteps, 
  accountSteps, 
  eventsSteps, 
  gallerySteps, 
  eventDetailSteps,
  statisticsSteps,
  routeDetailSteps,
  notificationsSteps,
  memberProfileSteps
} from "@/lib/tour-steps";

const tourStepsMap: Record<TourId, Step[]> = {
  index: indexSteps,
  dashboard: dashboardSteps,
  account: accountSteps,
  events: eventsSteps,
  gallery: gallerySteps,
  eventDetail: eventDetailSteps,
  statistics: statisticsSteps,
  routeDetail: routeDetailSteps,
  notifications: notificationsSteps,
  memberProfile: memberProfileSteps,
};

interface TourProviderProps {
  tourId: TourId;
  run: boolean;
  onFinish: () => void;
}

const TourProvider = ({ tourId, run, onFinish }: TourProviderProps) => {
  const { theme } = useTheme();
  const { markTourCompleted } = useTour();
  const isDark = theme === "dark";

  const steps = tourStepsMap[tourId] || [];

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      markTourCompleted(tourId);
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableScrolling={false}
      callback={handleCallback}
      locale={{
        back: "Zpět",
        close: "Zavřít",
        last: "Dokončit",
        next: "Další",
        skip: "Přeskočit",
      }}
      styles={{
        options: {
          arrowColor: isDark ? "hsl(240 10% 10%)" : "hsl(0 0% 100%)",
          backgroundColor: isDark ? "hsl(240 10% 10%)" : "hsl(0 0% 100%)",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          primaryColor: "hsl(32 95% 44%)",
          textColor: isDark ? "hsl(0 0% 98%)" : "hsl(240 10% 10%)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContainer: {
          textAlign: "left" as const,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
        tooltipContent: {
          fontSize: 14,
          padding: "12px 0",
        },
        buttonNext: {
          backgroundColor: "hsl(32 95% 44%)",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 14,
          fontWeight: 500,
        },
        buttonBack: {
          color: isDark ? "hsl(0 0% 70%)" : "hsl(0 0% 40%)",
          marginRight: 10,
          fontSize: 14,
        },
        buttonSkip: {
          color: isDark ? "hsl(0 0% 50%)" : "hsl(0 0% 50%)",
          fontSize: 14,
        },
        spotlight: {
          borderRadius: 12,
        },
      }}
      floaterProps={{
        styles: {
          floater: {
            filter: isDark
              ? "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))"
              : "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))",
          },
        },
      }}
    />
  );
};

export default TourProvider;
