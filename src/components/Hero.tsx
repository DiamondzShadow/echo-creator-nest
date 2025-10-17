import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.jpg";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient glow background */}
      <div className="absolute inset-0 bg-gradient-glow opacity-60" />
      
      {/* Content */}
      <div className="container relative z-10 px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Welcome to CrabbyTV 🦀
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              The ultimate streaming platform for creators. Go live instantly, connect with your audience, and get tipped with crypto.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-lg px-8 bg-gradient-hero hover:opacity-90 transition-all shadow-glow"
                onClick={() => navigate('/auth')}
              >
                Start Creating
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 border-2"
                onClick={() => navigate('/about')}
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Hero image */}
          <div className="animate-scale-in">
            <div className="relative rounded-3xl overflow-hidden shadow-glow">
              <img 
                src={heroImage} 
                alt="Creators collaborating in a modern studio" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-hero opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
