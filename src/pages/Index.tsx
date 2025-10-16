import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CreatorBenefits from "@/components/CreatorBenefits";
import CTA from "@/components/CTA";
import Navbar from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <CreatorBenefits />
      <CTA />
    </div>
  );
};

export default Index;
