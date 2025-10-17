import { Sparkles, Zap, Shield } from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "No Hidden Fees",
    description: "Keep more of what you earn with transparent pricing and no surprise charges."
  },
  {
    icon: Zap,
    title: "Instant Publishing",
    description: "Upload and share your content instantly with our lightning-fast platform."
  },
  {
    icon: Shield,
    title: "Creator Protection",
    description: "Your content is protected with advanced security and copyright management."
  }
];

const CreatorBenefits = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="container relative z-10">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            Built for Creators, By Creators
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            We understand what creators need because we are creators too
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow animate-float">
                  <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">{benefit.title}</h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-2">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CreatorBenefits;
