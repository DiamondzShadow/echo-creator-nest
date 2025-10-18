import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import FollowButton from "@/components/FollowButton";
import { WalletConnect } from "@/components/WalletConnect";
import { TipButton } from "@/components/TipButton";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { Users, UserPlus, Wallet, Coins } from "lucide-react";
import SoundCloudWidget from "@/components/SoundCloudWidget";
import { BrandBanner } from "@/components/BrandBanner";

const Profile = () => {
  const { userId } = useParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setUser(session?.user || null);

    // If userId param exists, fetch that user's profile
    // Otherwise, fetch the current user's profile
    const profileId = userId || session?.user?.id;

    if (!profileId) {
      if (!userId) {
        // Only redirect to auth if trying to view own profile without being logged in
        navigate("/auth");
      }
      return;
    }

    // Check if viewing own profile
    setIsOwnProfile(session?.user?.id === profileId);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    setProfile(profileData);
    setLoading(false);
  };

  const handleProfileUpdate = () => {
    fetchProfile();
  };

  useEffect(() => {

    fetchProfile();

    // Subscribe to profile updates
    const profileId = userId || user?.id;
    if (!profileId) return;

    const channel = supabase
      .channel("profile_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profileId}`,
        },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, userId]);

  if (loading || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />
      <div className="container px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <Card 
            className="border-0 shadow-glow bg-gradient-card animate-scale-in relative overflow-hidden"
            style={{
              backgroundColor: profile.background_image ? 'transparent' : undefined,
            }}
          >
            {profile.background_image && (
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url(${profile.background_image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            <CardContent className="pt-8 relative z-10">
              <div className="flex flex-col items-center text-center mb-8">
                <Avatar 
                  className="w-24 h-24 mb-4 ring-4"
                  style={{
                    borderColor: profile.theme_color || 'hsl(var(--primary))',
                  }}
                >
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback 
                    className="text-2xl text-white"
                    style={{
                      backgroundColor: profile.theme_color || 'hsl(var(--primary))',
                    }}
                  >
                    {profile.display_name?.[0]?.toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold mb-2">{profile.display_name}</h1>
                <p className="text-muted-foreground mb-4">@{profile.username}</p>
                {profile.bio && <p className="text-muted-foreground max-w-md mb-4">{profile.bio}</p>}
                
                {isOwnProfile && (
                  <div className="mb-4">
                    <ProfileEditDialog profile={profile} onUpdate={handleProfileUpdate} />
                  </div>
                )}
                
                {isOwnProfile && (
                  <div className="flex gap-2 mb-4">
                    <WalletConnect />
                  </div>
                )}
                
                {profile.wallet_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Wallet className="w-4 h-4" />
                    <code className="text-xs">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</code>
                  </div>
                )}
                
                {!isOwnProfile && (
                  <div className="flex gap-2">
                    <FollowButton profileId={profile.id} currentUserId={user?.id} />
                    <TipButton 
                      recipientUserId={profile.id}
                      recipientWalletAddress={profile.wallet_address}
                      recipientUsername={profile.username}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
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
                <Card className="border shadow-card">
                  <CardContent className="pt-6 text-center">
                    <Coins className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{profile.tip_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Tips Received</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-card">
                  <CardContent className="pt-6 text-center">
                    <Wallet className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{profile.wallet_address ? '✓' : '✗'}</p>
                    <p className="text-sm text-muted-foreground">Wallet</p>
                  </CardContent>
                </Card>
              </div>

              {profile.soundcloud_url && (
                <div className="max-w-3xl mx-auto mt-8">
                  <h2 className="text-xl font-semibold mb-2">SoundCloud</h2>
                  <SoundCloudWidget url={profile.soundcloud_url} visual={false} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
