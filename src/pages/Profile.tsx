import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import FollowButton from "@/components/FollowButton";
import { WalletConnect } from "@/components/WalletConnect";
import { MultiChainTipButton } from "@/components/MultiChainTipButton";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { Users, UserPlus, Wallet, Coins, Loader2, RefreshCw, MapPin, Twitter, Instagram, Youtube, Tv, Music, Gamepad2, Palette, Radio, LogOut } from "lucide-react";
import SoundCloudWidget from "@/components/SoundCloudWidget";
import { BrandBanner } from "@/components/BrandBanner";
import LiveStreamCard from "@/components/LiveStreamCard";
import { User } from "@supabase/supabase-js";
import { useXRPBalance } from "@/hooks/useXRPBalance";
import { useSOLBalance } from "@/hooks/useSOLBalance";
import { Badge } from "@/components/ui/badge";
import { SolanaWalletConnect } from "@/components/SolanaWalletConnect";
import { TransactionHistory } from "@/components/TransactionHistory";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme_color: string | null;
  background_image: string | null;
  soundcloud_url: string | null;
  wallet_address: string | null;
  xrp_address: string | null;
  sol_address: string | null;
  followers_count?: number;
  following_count?: number;
  total_tips_received?: number;
  stream_types?: string[] | null;
  content_categories?: string[] | null;
  location?: string | null;
  social_twitter?: string | null;
  social_instagram?: string | null;
  social_youtube?: string | null;
}

interface Recording {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  created_at: string;
  livepeer_playback_id: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}
 
const Profile = () => {
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { balance: xrpBalance, loading: xrpLoading, error: xrpError, refetch: refetchXRPBalance } = useXRPBalance(profile?.xrp_address);
  const { balance: solBalance, loading: solLoading, error: solError, refetch: refetchSOLBalance } = useSOLBalance(profile?.sol_address);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    navigate("/");
  };

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

    // Fetch ready recordings for this profile
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', profileId)
      .eq('status', 'ready')
      .not('livepeer_playback_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    setRecordings(assets || []);
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
          setProfile(payload.new as ProfileData);
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
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.bio && <p className="text-muted-foreground max-w-md mb-4">{profile.bio}</p>}
                
                {isOwnProfile && !profile.bio && !profile.location && !profile.social_twitter && !profile.social_instagram && !profile.social_youtube && (!profile.stream_types || profile.stream_types.length === 0) && (!profile.content_categories || profile.content_categories.length === 0) && (
                  <Alert className="mb-4 bg-primary/5 border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      <strong>Complete your profile!</strong> Add your bio, location, social links, stream types, and content categories to help others discover you.
                    </AlertDescription>
                  </Alert>
                )}
                
                {profile.content_categories && profile.content_categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.content_categories.map((category) => (
                      <Badge key={category} variant="secondary" className="capitalize">
                        {category === 'irl' ? 'IRL' : category.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {profile.stream_types && profile.stream_types.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.stream_types.map((type) => (
                      <Badge key={type} variant="outline" className="capitalize">
                        {type === 'native' ? 'CrabbyTV' : type}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {(profile.social_twitter || profile.social_instagram || profile.social_youtube) && (
                  <div className="flex gap-3 mb-4">
                    {profile.social_twitter && (
                      <a 
                        href={`https://twitter.com/${profile.social_twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {profile.social_instagram && (
                      <a 
                        href={`https://instagram.com/${profile.social_instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {profile.social_youtube && (
                      <a 
                        href={`https://youtube.com/${profile.social_youtube.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}
                
                {isOwnProfile && (
                  <div className="flex gap-2 mb-4">
                    <ProfileEditDialog profile={profile} onUpdate={handleProfileUpdate} />
                    <PasswordChangeDialog />
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                )}
                
                {isOwnProfile && (
                  <div className="flex gap-2 mb-4">
                    <WalletConnect />
                    <SolanaWalletConnect />
                  </div>
                )}
                
                {profile.wallet_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Wallet className="w-4 h-4" />
                    <code className="text-xs">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</code>
                    <Badge variant="secondary" className="text-xs">EVM</Badge>
                  </div>
                )}
                
                {profile.xrp_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Wallet className="w-4 h-4" />
                    <code className="text-xs">{profile.xrp_address.slice(0, 6)}...{profile.xrp_address.slice(-4)}</code>
                    <Badge variant="secondary" className="text-xs">XRP</Badge>
                    {xrpLoading ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    ) : xrpError ? (
                      <span className="text-xs text-destructive">{xrpError}</span>
                    ) : xrpBalance ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-primary">{xrpBalance} XRP</span>
                        <button
                          onClick={refetchXRPBalance}
                          disabled={xrpLoading}
                          className="p-1 hover:bg-accent rounded-sm transition-colors disabled:opacity-50"
                          aria-label="Refresh XRP balance"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                
                {profile.sol_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Wallet className="w-4 h-4" />
                    <code className="text-xs">{profile.sol_address.slice(0, 6)}...{profile.sol_address.slice(-4)}</code>
                    <Badge variant="secondary" className="text-xs">SOL</Badge>
                    {solLoading ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    ) : solError ? (
                      <span className="text-xs text-destructive">{solError}</span>
                    ) : solBalance ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-primary">{solBalance} SOL</span>
                        <button
                          onClick={refetchSOLBalance}
                          disabled={solLoading}
                          className="p-1 hover:bg-accent rounded-sm transition-colors disabled:opacity-50"
                          aria-label="Refresh SOL balance"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                
                {!isOwnProfile && (
                  <div className="flex gap-2">
                    <FollowButton profileId={profile.id} currentUserId={user?.id} />
                    <MultiChainTipButton 
                      recipientUserId={profile.id}
                      recipientWalletAddress={profile.wallet_address}
                      recipientXRPAddress={profile.xrp_address}
                      recipientSOLAddress={profile.sol_address}
                      recipientUsername={profile.username}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                <Card className="border shadow-card">
                  <CardContent className="pt-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{profile.followers_count || 0}</p>
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
                    <p className="text-2xl font-bold">{Math.round(profile.total_tips_received || 0)}</p>
                    <p className="text-sm text-muted-foreground">Tips Value</p>
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

              {recordings.length > 0 && (
                <div className="max-w-3xl mx-auto mt-10">
                  <h2 className="text-xl font-semibold mb-4">Recordings</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {recordings.map((asset) => (
                      <LiveStreamCard
                        key={asset.id}
                        stream={{
                          ...asset,
                          profiles: {
                            username: profile.username,
                            display_name: profile.display_name,
                            avatar_url: profile.avatar_url,
                          },
                        }}
                        isRecording
                        isOwner={isOwnProfile}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="max-w-3xl mx-auto mt-10">
                <TransactionHistory userId={profile.id} />
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
