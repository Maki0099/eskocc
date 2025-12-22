import { useState, useEffect } from "react";
import { useTour } from "@/hooks/useTour";
import TourProvider from "@/components/tour/TourProvider";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import LeadershipSection from "@/components/home/LeadershipSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ClubhouseSection from "@/components/home/ClubhouseSection";
import CTASection from "@/components/home/CTASection";
import TeaserSection from "@/components/home/TeaserSection";
import InstallBanner from "@/components/pwa/InstallBanner";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

const Index = () => {
  const { startTour, shouldAutoStart, isTourCompleted } = useTour();
  const [tourRunning, setTourRunning] = useState(false);

  const handleStartTour = () => {
    setTourRunning(true);
    startTour("index");
  };

  useEffect(() => {
    if (shouldAutoStart("index")) {
      const timer = setTimeout(() => handleStartTour(), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div data-tour="hero-section">
          <HeroSection />
        </div>
        <div data-tour="teaser-stats">
          <TeaserSection />
        </div>
        <div data-tour="features-section">
          <FeaturesSection />
        </div>
        <div data-tour="clubhouse-section">
          <ClubhouseSection />
        </div>
        <div data-tour="cta-section">
          <CTASection />
        </div>
        <LeadershipSection />
      </main>
      <Footer />
      <InstallBanner />
      
      {/* Floating help button */}
      {!isTourCompleted("index") && (
        <Button
          variant="secondary"
          size="icon"
          onClick={handleStartTour}
          className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg h-12 w-12"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      )}
      
      <TourProvider
        tourId="index"
        run={tourRunning}
        onFinish={() => setTourRunning(false)}
      />
    </div>
  );
};

export default Index;
