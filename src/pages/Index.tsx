import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import LeadershipSection from "@/components/home/LeadershipSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ClubhouseSection from "@/components/home/ClubhouseSection";
import CTASection from "@/components/home/CTASection";
import TeaserSection from "@/components/home/TeaserSection";
import InstallBanner from "@/components/pwa/InstallBanner";
import Seo from "@/components/Seo";

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
    </div>
  );
};

export default Index;
