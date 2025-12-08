import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import LeadershipSection from "@/components/home/LeadershipSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ClubhouseSection from "@/components/home/ClubhouseSection";
import CTASection from "@/components/home/CTASection";
import TeaserSection from "@/components/home/TeaserSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TeaserSection />
        <ClubhouseSection />
        <CTASection />
        <LeadershipSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
