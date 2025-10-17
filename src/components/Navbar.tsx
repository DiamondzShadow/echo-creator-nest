import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogOut, Video, User as UserIcon, Trophy, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    setOpen(false);
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16 px-4">
        <button
          onClick={() => navigate("/")}
          className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent"
        >
          🦀 CrabbyTV
        </button>

        <div className="flex items-center gap-4">
          {isMobile ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  {user ? (
                    <>
                      <Button
                        onClick={() => handleNavigate("/live")}
                        className="bg-gradient-hero hover:opacity-90 w-full justify-start"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Go Live
                      </Button>
                      <Button variant="outline" onClick={() => handleNavigate("/discover")} className="w-full justify-start">
                        Discover
                      </Button>
                      <Button variant="outline" onClick={() => handleNavigate("/creators")} className="w-full justify-start">
                        <Trophy className="w-4 h-4 mr-2" />
                        Creators
                      </Button>
                      <Button variant="outline" onClick={() => handleNavigate("/profile")} className="w-full justify-start">
                        <UserIcon className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                      <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => handleNavigate("/auth")} className="bg-gradient-hero hover:opacity-90 w-full">
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <>
              {user ? (
                <>
                  <Button
                    onClick={() => navigate("/live")}
                    className="bg-gradient-hero hover:opacity-90"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Go Live
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/discover")}>
                    Discover
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/creators")}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Creators
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/profile")}>
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                  <Button variant="ghost" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/auth")} className="bg-gradient-hero hover:opacity-90">
                  Sign In
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
