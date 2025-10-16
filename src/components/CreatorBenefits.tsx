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
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="container relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built for Creators, By Creators
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We understand what creators need because we are creators too
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
                  <Icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CreatorBenefits;
