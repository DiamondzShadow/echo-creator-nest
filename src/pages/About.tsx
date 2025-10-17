import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Video, Users, Wallet, Shield, Zap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Zap className="w-12 h-12" />,
      title: "Instant Live Streaming",
      description: "Go live in seconds with our cutting-edge streaming technology. No setup required, just click and start creating."
    },
    {
      icon: <Wallet className="w-12 h-12" />,
      title: "Crypto Tips",
      description: "Receive tips directly from your audience using cryptocurrency. Fast, secure, and borderless transactions."
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Real-Time Chat",
      description: "Engage with your viewers through our built-in chat system. Create meaningful connections with your community."
    },
    {
      icon: <Video className="w-12 h-12" />,
      title: "Screen Sharing",
      description: "Share your screen effortlessly during streams. Perfect for tutorials, gaming, and collaborative content."
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Secure Platform",
      description: "Your content and earnings are protected with enterprise-grade security and blockchain technology."
    },
    {
      icon: <Globe className="w-12 h-12" />,
      title: "Global Reach",
      description: "Connect with viewers worldwide. Build your audience across borders with our global streaming infrastructure."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-20">
        {/* Hero Section */}
        <section className="text-center mb-20 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
            Welcome to CrabbyTV 🦀
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The next-generation streaming platform where creators thrive and audiences connect. 
            Stream live, earn crypto tips, and build your community—all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              onClick={() => navigate('/creators')}
            >
              Explore Creators
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 animate-fade-in">
            Why Choose CrabbyTV?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="p-6 hover:shadow-glow transition-all animate-scale-in border-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12 animate-fade-in">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Sign Up</h3>
              <p className="text-muted-foreground">
                Create your free account and set up your creator profile in minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Go Live</h3>
              <p className="text-muted-foreground">
                Start streaming instantly with our one-click live feature. No technical setup required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Grow & Earn</h3>
              <p className="text-muted-foreground">
                Build your audience, engage with viewers, and receive crypto tips directly.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="relative rounded-3xl overflow-hidden shadow-glow max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-hero opacity-95" />
            <div className="relative z-10 py-16 px-8">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Join the Revolution?
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-8">
                Thousands of creators are already building their future on CrabbyTV
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 hover:scale-105 transition-all"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
