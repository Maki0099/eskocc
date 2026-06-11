import { lazy, Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import Seo from "@/components/Seo";

const LeadershipSection = lazy(() => import("@/components/home/LeadershipSection"));
const FeaturesSection = lazy(() => import("@/components/home/FeaturesSection"));
const ClubhouseSection = lazy(() => import("@/components/home/ClubhouseSection"));
const CTASection = lazy(() => import("@/components/home/CTASection"));
const TeaserSection = lazy(() => import("@/components/home/TeaserSection"));
const InstallBanner = lazy(() => import("@/components/pwa/InstallBanner"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="ESKO.cc | Cyklistický klub Karolinka, Beskydy"
        description="Cyklistický klub z Karolinky v Beskydech. Společné vyjížďky, cyklotrasy s GPX a komunita nadšenců pro silniční i horské kolo."
        path="/"
      />
      <Header />

      <main>
        <div data-tour="hero-section">
          <HeroSection />
        </div>
        <Suspense fallback={null}>
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
        </Suspense>
      </main>
      <Footer />
      <Suspense fallback={null}>
        <InstallBanner />
      </Suspense>
    </div>
  );
};

export default Index;
