import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import CreatorBenefits from "@/components/CreatorBenefits";
import CTA from "@/components/CTA";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <CreatorBenefits />
      <CTA />
    </div>
  );
};

export default Index;
