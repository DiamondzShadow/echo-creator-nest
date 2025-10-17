import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CreatorBenefits from "@/components/CreatorBenefits";
import CTA from "@/components/CTA";
import Navbar from "@/components/Navbar";
import Leaderboard from "@/components/Leaderboard";
import TopProfiles from "@/components/TopProfiles";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Leaderboard />
      <TopProfiles />
      <Features />
      <CreatorBenefits />
      <CTA />
    </div>
  );
};

export default Index;
