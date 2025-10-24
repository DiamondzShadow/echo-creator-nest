import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogOut, Video, User as UserIcon, Menu, PlayCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Users, Film, HardDrive, Trophy } from "lucide-react";
import crabbyLogo from "@/assets/crabby-logo.jpg";

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
          className="flex items-center gap-2"
        >
          <img 
            src={crabbyLogo} 
            alt="CrabbyTV Logo" 
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover"
          />
          <span className="text-xl sm:text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            CrabbyTV
          </span>
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
                        <Search className="w-4 h-4 mr-2" />
                        Discover
                      </Button>
                      <Button variant="outline" onClick={() => handleNavigate("/videos")} className="w-full justify-start">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        My Videos
                      </Button>
                      <div className="border-t pt-4">
                        <p className="text-xs text-muted-foreground mb-2 px-2">More</p>
                        <Button variant="ghost" onClick={() => handleNavigate("/meet")} className="w-full justify-start">
                          <Users className="w-4 h-4 mr-2" />
                          Video Meetings
                        </Button>
                        <Button variant="ghost" onClick={() => handleNavigate("/creators")} className="w-full justify-start">
                          <Trophy className="w-4 h-4 mr-2" />
                          Top Creators
                        </Button>
                        <Button variant="ghost" onClick={() => handleNavigate("/fvm")} className="w-full justify-start">
                          <HardDrive className="w-4 h-4 mr-2" />
                          Decentralized Storage
                        </Button>
                      </div>
                      <div className="border-t pt-4">
                        <Button variant="outline" onClick={() => handleNavigate("/profile")} className="w-full justify-start">
                          <UserIcon className="w-4 h-4 mr-2" />
                          Profile
                        </Button>
                        <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start text-destructive hover:text-destructive">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
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
                    <Search className="w-4 h-4 mr-2" />
                    Discover
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/videos")}>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    My Videos
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <MoreHorizontal className="w-4 h-4 mr-2" />
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Features</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate("/meet")}>
                        <Users className="w-4 h-4 mr-2" />
                        Video Meetings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/creators")}>
                        <Trophy className="w-4 h-4 mr-2" />
                        Top Creators
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/fvm")}>
                        <HardDrive className="w-4 h-4 mr-2" />
                        Decentralized Storage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" onClick={() => navigate("/profile")}>
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                  <Button variant="ghost" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
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
