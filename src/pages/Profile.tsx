import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import FollowButton from "@/components/FollowButton";
import { Users, UserPlus } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    fetchProfile();

    // Subscribe to profile updates
    const channel = supabase
      .channel("profile_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  if (loading || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-glow bg-gradient-card animate-scale-in">
            <CardContent className="pt-8">
              <div className="flex flex-col items-center text-center mb-8">
                <Avatar className="w-24 h-24 mb-4 ring-4 ring-primary/20">
                  <AvatarFallback className="text-2xl bg-gradient-hero text-primary-foreground">
                    {profile.display_name?.[0]?.toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold mb-2">{profile.display_name}</h1>
                <p className="text-muted-foreground mb-4">@{profile.username}</p>
                {profile.bio && <p className="text-muted-foreground max-w-md mb-4">{profile.bio}</p>}
                <FollowButton profileId={profile.id} currentUserId={user?.id} />
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <Card className="border shadow-card">
                  <CardContent className="pt-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{profile.follower_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-card">
                  <CardContent className="pt-6 text-center">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{profile.following_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
