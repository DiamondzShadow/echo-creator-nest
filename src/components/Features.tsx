import { Video, TrendingUp, DollarSign, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Video,
    title: "Pro Creation Tools",
    description: "Edit, enhance, and publish content with professional-grade tools designed for creators."
  },
  {
    icon: TrendingUp,
    title: "Smart Analytics",
    description: "Track your growth with detailed insights and analytics to understand your audience better."
  },
  {
    icon: DollarSign,
    title: "Monetization Made Easy",
    description: "Multiple revenue streams including subscriptions, tips, and brand partnerships."
  },
  {
    icon: Users,
    title: "Build Your Community",
    description: "Connect directly with your fans and build a loyal community around your content."
  }
];

const Features = () => {
  return (
    <section className="py-24 px-4">
      <div className="container">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to help creators thrive in the digital age
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="border-0 bg-gradient-card shadow-card hover:shadow-glow transition-all duration-300 animate-scale-in hover:scale-105"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-hero flex items-center justify-center mb-4">
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
