import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { LiveStreamPlayer } from "@/components/LiveStreamPlayer";
import { LiveKitViewer } from "@/components/LiveKitViewer";
import { TipButton } from "@/components/TipButton";
import FollowButton from "@/components/FollowButton";
import { StreamChat } from "@/components/StreamChat";
import { Eye, ArrowLeft } from "lucide-react";

const Watch = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [isLiveKitStream, setIsLiveKitStream] = useState(false);

  useEffect(() => {
    fetchStream();
    fetchCurrentUser();

    // Subscribe to stream updates
    const channel = supabase
      .channel(`stream_${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          setStream(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user);
  };

  const fetchStream = async () => {
    // Try to fetch from live_streams first
    const { data: streamData } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", streamId)
      .maybeSingle();

    if (streamData) {
      setStream(streamData);
      
      // Check if this is a LiveKit stream (instant stream)
      // LiveKit streams have room names starting with "stream-"
      const isLiveKit = streamData.livepeer_playback_id?.startsWith('stream-');
      setIsLiveKitStream(isLiveKit);

      // If LiveKit stream, get viewer token
      if (isLiveKit && streamData.is_live) {
        const { data: tokenData } = await supabase.functions.invoke('livekit-token', {
          body: {
            action: 'create_viewer_token',
            roomName: streamData.livepeer_playback_id,
          }
        });

        if (tokenData?.token) {
          setLivekitToken(tokenData.token);
        }
      }
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", streamData.user_id)
        .single();
      
      setProfile(profileData);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 pt-24 flex items-center justify-center">
          <p className="text-muted-foreground">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!stream || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 pt-24 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Stream not found</p>
            <Button onClick={() => navigate("/discover")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-16">
        <Button
          variant="ghost"
          onClick={() => navigate("/discover")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {isLiveKitStream && livekitToken ? (
                <LiveKitViewer
                  roomToken={livekitToken}
                  title={stream.title}
                  isLive={stream.is_live}
                />
              ) : stream.livepeer_playback_id && !isLiveKitStream ? (
                <LiveStreamPlayer
                  playbackId={stream.livepeer_playback_id}
                  title={stream.title}
                  isLive={stream.is_live}
                  viewerId={currentUser?.id}
                />
              ) : (
                <Card className="border-0 shadow-glow bg-gradient-card">
                  <CardContent className="pt-6">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">
                        {stream.is_live ? "Stream starting soon..." : "Stream ended"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-0 shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold">{stream.title}</h1>
                        {stream.is_live && (
                          <Badge className="bg-destructive text-destructive-foreground">
                            ● LIVE
                          </Badge>
                        )}
                      </div>
                      {stream.description && (
                        <p className="text-muted-foreground">{stream.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {stream.viewer_count} watching
                    </div>
                    {stream.started_at && (
                      <span>
                        Started {new Date(stream.started_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Live Chat */}
              {stream.is_live && (
                <div className="lg:hidden">
                  <StreamChat 
                    streamId={stream.id}
                    currentUserId={currentUser?.id}
                    currentUsername={profile?.username}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Creator Profile */}
              <Card className="border-0 shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-xl bg-gradient-hero text-primary-foreground">
                        {profile.display_name?.[0]?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold">{profile.display_name}</h3>
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>
                  )}

                  <div className="flex gap-2">
                    <FollowButton 
                      profileId={profile.id} 
                      currentUserId={currentUser?.id}
                    />
                    <TipButton
                      recipientUserId={profile.id}
                      recipientWalletAddress={profile.wallet_address}
                      recipientUsername={profile.username}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{profile.follower_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Followers</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{profile.tip_count || 0}</p>
                        <p className="text-xs text-muted-foreground">Tips</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Chat - Desktop */}
              {stream.is_live && (
                <div className="hidden lg:block h-[600px]">
                  <StreamChat 
                    streamId={stream.id}
                    currentUserId={currentUser?.id}
                    currentUsername={profile?.username}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;