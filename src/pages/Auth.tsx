import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "@/components/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BrandBanner } from "@/components/BrandBanner";
import authBg from "@/assets/brand-banner-1.jpg";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 relative">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${authBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 z-20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="relative z-10 animate-scale-in">
          <AuthForm onSuccess={() => navigate("/")} />
        </div>
    </div>
  );
};

export default Auth;
