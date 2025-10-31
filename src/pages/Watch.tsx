import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { LivepeerViewer } from "@/components/LivepeerViewer";
import { TipButton } from "@/components/TipButton";
import FollowButton from "@/components/FollowButton";
import { StreamChat } from "@/components/StreamChat";
import { Eye, ArrowLeft, Loader2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrandBanner } from "@/components/BrandBanner";
import StreamReactions, { ReactionType } from "@/components/StreamReactions";
import SoundCloudWidget from "@/components/SoundCloudWidget";
import { User } from "@supabase/supabase-js";

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  is_live: boolean;
  viewer_count: number;
  livepeer_playback_id: string | null;
  livepeer_stream_id: string | null;
  started_at: string;
  ended_at: string | null;
}

interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  soundcloud_url: string | null;
  wallet_address: string | null;
  bio?: string | null;
  follower_count?: number;
  tip_count?: number;
  total_tips_received?: number;
}

const Watch = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [isLiveKitStream, setIsLiveKitStream] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [checkingRecording, setCheckingRecording] = useState(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [assetPlaybackUrl, setAssetPlaybackUrl] = useState<string | null>(null);
  
  const handleEmitOverlay = (reaction: ReactionType) => {
    // Fire a DOM event that overlay components listen for
    const event = new CustomEvent('reaction:add', { detail: { reaction } });
    window.dispatchEvent(event);
  };

  const handleShareStream = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Stream link copied to clipboard",
    });
  };

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
          setStream(payload.new as StreamData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  // Auto-fetch viewer token when the stream flips to live after page load
  useEffect(() => {
    if (!stream) return;
    const isLiveKit = stream.livepeer_playback_id?.startsWith('stream-');

    if (isLiveKit && stream.is_live && !livekitToken) {
      (async () => {
        try {
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('livekit-token', {
            body: {
              action: 'create_viewer_token',
              roomName: stream.livepeer_playback_id,
            }
          });

          if (tokenError) {
            console.error('❌ Failed to get viewer token (live update):', tokenError);
            toast({
              title: 'Connection Error',
              description: 'Unable to connect to live stream. Please try refreshing.',
              variant: 'destructive',
            });
          } else if (tokenData?.token) {
            console.log('✅ Viewer token obtained after live update');
            setLivekitToken(tokenData.token);
          }
        } catch (err) {
          console.error('❌ Exception getting viewer token (live update):', err);
        }
      })();
    }
  }, [stream?.is_live, stream?.livepeer_playback_id, livekitToken]);

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

    // If not found in live_streams, try assets (recordings)
    if (!streamData) {
      const { data: assetData } = await supabase
        .from("assets")
        .select("*")
        .eq("id", streamId)
        .maybeSingle();

      if (assetData) {
        // Transform asset to stream format
        const mockStream = {
          id: assetData.id,
          title: assetData.title,
          description: assetData.description,
          user_id: assetData.user_id,
          is_live: false,
          viewer_count: 0,
          livepeer_playback_id: assetData.livepeer_playback_id,
          livepeer_stream_id: null,
          started_at: assetData.created_at,
          ended_at: assetData.ready_at,
        };
        
        setStream(mockStream);
        setHasRecording(true);
        setIsLiveKitStream(false);
        // Use original stream id for reactions if available (FK constraint)
        setReactionTargetId(assetData.stream_id || null);

        // If webhook stored a direct URL in livepeer_playback_id, use it for playback
        const val = assetData.livepeer_playback_id as string | null;
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
          setAssetPlaybackUrl(val);
        }

        // Fetch profile for this asset
        if (assetData.user_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', assetData.user_id)
            .maybeSingle();
          setProfile(prof);
        }

        setLoading(false);
        return;
      }
    }

    if (streamData) {
      setStream(streamData);
      setReactionTargetId(streamData.id);
      
      // Check if this is a LiveKit stream (instant stream)
      // LiveKit streams have room names starting with "stream-"
      const isLiveKit = streamData.livepeer_playback_id?.startsWith('stream-');
      setIsLiveKitStream(isLiveKit);

      // If LiveKit stream AND actually live (broadcaster has published tracks), get viewer token
      if (isLiveKit && streamData.is_live) {
        console.log('📺 Stream is live! Fetching viewer token for LiveKit room:', streamData.livepeer_playback_id);
        
        try {
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('livekit-token', {
            body: {
              action: 'create_viewer_token',
              roomName: streamData.livepeer_playback_id,
            }
          });

          if (tokenError) {
            console.error('❌ Failed to get viewer token:', tokenError);
            toast({
              title: 'Connection Error',
              description: 'Unable to connect to live stream. Please try refreshing.',
              variant: 'destructive',
            });
          } else if (tokenData?.token) {
            console.log('✅ Viewer token obtained successfully');
            setLivekitToken(tokenData.token);
          } else {
            console.error('❌ No token in response:', tokenData);
          }
        } catch (err) {
          console.error('❌ Exception getting viewer token:', err);
          toast({
            title: 'Connection Error',
            description: 'Failed to connect to stream',
            variant: 'destructive',
          });
        }
      }
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", streamData.user_id)
        .single();
      
      setProfile(profileData);

      // Check for recordings if stream has ended
      if (!streamData.is_live) {
        setCheckingRecording(true);
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .eq('stream_id', streamData.id)
          .eq('status', 'ready')
          .limit(1);
        
        setHasRecording(assets && assets.length > 0);
        setCheckingRecording(false);
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 pt-24 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
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

  // Show proper message if stream ended and no recording available
  if (!stream.is_live && !hasRecording && !checkingRecording && !isLiveKitStream && !assetPlaybackUrl) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 pt-24 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-4 text-6xl">📹</div>
            <h2 className="text-2xl font-bold mb-2">Stream Has Ended</h2>
            <p className="text-muted-foreground mb-4">
              This stream has finished and no recording is available yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {stream.description?.includes('Recording: enabled') 
                ? 'Recordings may take a few minutes to process. Please check back shortly.'
                : 'Recording was not enabled for this stream.'}
            </p>
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
      <BrandBanner />
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
              {stream.livepeer_playback_id && stream.is_live ? (
                <LivepeerViewer
                  playbackId={stream.livepeer_playback_id}
                  title={stream.title}
                  isLive={stream.is_live}
                  viewerCount={stream.viewer_count || 0}
                />
              ) : !stream.is_live ? (
                <Card className="border-0 shadow-glow bg-gradient-card">
                  <CardContent className="pt-6">
                    <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center p-8">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold mb-2">Stream Starting Soon...</p>
                      <p className="text-sm text-muted-foreground text-center">
                        The broadcaster is setting up their camera and microphone. This page will update automatically when they go live.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : assetPlaybackUrl ? (
                <Card className="border-0 shadow-glow bg-gradient-card">
                  <CardContent className="pt-6">
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <video
                        controls
                        playsInline
                        className="w-full h-full"
                        src={assetPlaybackUrl}
                      />
                    </div>
                  </CardContent>
                </Card>
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleShareStream}
                      className="shrink-0"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
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

                  {/* Reactions */}
                  {reactionTargetId && (
                    <div className="mt-4">
                      <StreamReactions
                        streamId={reactionTargetId}
                        currentUserId={currentUser?.id}
                        onReact={handleEmitOverlay}
                      />
                    </div>
                  )}
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
                        <p className="text-2xl font-bold">{Math.round(profile.total_tips_received || 0)}</p>
                        <p className="text-xs text-muted-foreground">Tips</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Creator SoundCloud (if provided) */}
              {profile.soundcloud_url && (
                <Card className="border-0 shadow-card">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 text-lg">🎵 Creator's Music</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Listen to the creator's tracks while watching
                    </p>
                    <SoundCloudWidget url={profile.soundcloud_url} visual={false} autoPlay={false} />
                  </CardContent>
                </Card>
              )}

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