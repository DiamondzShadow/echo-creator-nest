import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6">
      <div className="container">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-glow">
          <div className="absolute inset-0 bg-gradient-hero opacity-95" />
          
          <div className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-4 sm:mb-6 animate-fade-in">
              Ready to Start Your Creator Journey?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/90 mb-6 sm:mb-8 max-w-2xl mx-auto animate-fade-in px-4">
              Join thousands of creators who are already growing their audience and earning on our platform
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-base sm:text-lg px-6 sm:px-8 animate-scale-in hover:scale-105 transition-all"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
