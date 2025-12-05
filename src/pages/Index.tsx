import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import LeadershipSection from "@/components/home/LeadershipSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ClubhouseSection from "@/components/home/ClubhouseSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <LeadershipSection />
        <FeaturesSection />
        <ClubhouseSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
