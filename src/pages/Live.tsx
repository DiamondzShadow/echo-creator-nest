import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Video, StopCircle, Loader2, Youtube } from "lucide-react";
import Navbar from "@/components/Navbar";
import { InstantLiveStreamLiveKit } from "@/components/InstantLiveStreamLiveKit";
import { StreamChat } from "@/components/StreamChat";
import { BrandBanner } from "@/components/BrandBanner";
import { YouTubeConnect } from "@/components/YouTubeConnect";
import { TikTokConnect } from "@/components/TikTokConnect";
import { TwitchConnect } from "@/components/TwitchConnect";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { TwitchEmbed } from "@/components/TwitchEmbed";
import { TikTokEmbed } from "@/components/TikTokEmbed";
import { TipButton } from "@/components/TipButton";
import { User } from "@supabase/supabase-js";

const Live = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [enableRecording, setEnableRecording] = useState(true);
  const [saveToStorj, setSaveToStorj] = useState(false);
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [endingAll, setEndingAll] = useState(false);
  const [streamMode, setStreamMode] = useState<'browser' | 'pull' | 'youtube' | 'twitch' | 'tiktok'>('browser');
  const [pullStreamUrl, setPullStreamUrl] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [youtubeStreamTitle, setYoutubeStreamTitle] = useState("");
  const [twitchChannel, setTwitchChannel] = useState("");
  const [twitchTitle, setTwitchTitle] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [tiktokTitle, setTiktokTitle] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  // Use fetch with keepalive for reliable stream cleanup when tab closes
  useEffect(() => {
    if (!streamId) return;

    const handleBeforeUnload = () => {
      // Use fetch with keepalive for reliable delivery even as page unloads
      // This allows us to include auth headers unlike sendBeacon
      supabase.functions.invoke('end-stream', {
        body: { streamId }
      }).catch(err => {
        console.warn('Failed to end stream on beforeunload:', err);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [streamId]);

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Creating LiveKit room for instant browser streaming...');
      
      // Generate unique room name
      const roomId = `stream-${user.id}-${Date.now()}`;
      setRoomName(roomId);

      // First create stream record in database (NOT live yet - will be set when tracks are published)
      const { data, error } = await supabase
        .from("live_streams")
        .insert({
          user_id: user.id,
          title: title.trim().substring(0, 200),
          description: description?.trim().substring(0, 2000),
          is_live: false, // Don't mark as live until broadcaster publishes tracks
          started_at: new Date().toISOString(),
          livepeer_stream_id: roomId,
          livepeer_playback_id: roomId,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to save stream: ${error.message}`);
      }

      console.log('Stream record created:', data);
      setStreamId(data.id);

      // Get LiveKit token for broadcaster
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('livekit-token', {
        body: {
          action: 'create_token',
          roomName: roomId,
          streamId: data.id,
          enableRecording,
          saveToStorj,
        }
      });

      if (tokenError || !tokenData?.token) {
        console.error('Token error:', tokenError);
        throw new Error('Failed to get streaming token');
      }

      console.log('LiveKit token obtained');
      setLivekitToken(tokenData.token);
      setIsLive(true);

      toast({
        title: "Stream created!",
        description: "Your browser stream is ready - camera and mic will activate next!",
      });
    } catch (error) {
      console.error('Stream creation error:', error);
      toast({
        title: "Failed to create stream",
        description: error instanceof Error ? error.message : "Please check console for details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndStream = async () => {
    setLoading(true);

    try {
      console.log('🛑 Ending stream:', streamId);
      
      // Use the dedicated edge function for reliable cleanup
      const { error } = await supabase.functions.invoke('end-stream', {
        body: { streamId }
      });

      if (error) {
        console.error('Error ending stream:', error);
        throw error;
      }

      console.log('✅ Stream ended successfully');

      // Clean up all state
      setIsLive(false);
      setStreamId(null);
      setTitle("");
      setDescription("");
      setLivekitToken("");
      setRoomName("");
      setRecordingStarted(false);
      
      toast({
        title: "Stream ended",
        description: "Your live stream has been ended.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartPullStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Creating pull stream from:', pullStreamUrl);

      const { data, error } = await supabase.functions.invoke('livepeer-pull-stream', {
        body: {
          action: 'create',
          pullUrl: pullStreamUrl,
          title: title || 'Pull Stream',
          description: description || '',
        },
      });

      if (error) throw error;

      console.log('Pull stream created:', data);
      setStreamId(data.streamId);
      setIsLive(true);

      toast({
        title: "Pull stream started!",
        description: "Your external stream is now live",
      });
    } catch (error) {
      console.error('Pull stream error:', error);
      toast({
        title: "Failed to start pull stream",
        description: error instanceof Error ? error.message : "Please check console for details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndAllStreams = async () => {
    setEndingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('end-stream', {
        body: { endAll: true }
      });

      if (error) throw error;

      toast({
        title: "Streams ended",
        description: `Successfully ended ${data?.endedCount || 0} live stream(s)`,
      });

      // Refresh page to clear state
      window.location.reload();
    } catch (error) {
      console.error('Error ending streams:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end streams",
        variant: "destructive",
      });
    } finally {
      setEndingAll(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />
      <div className="container px-4 pt-24 pb-16">
        {/* Emergency cleanup button */}
        {!isLive && (
          <div className="max-w-4xl mx-auto mb-4">
            <Button
              onClick={handleEndAllStreams}
              variant="outline"
              size="sm"
              disabled={endingAll}
              className="w-full"
            >
              {endingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ending streams...
                </>
              ) : (
                <>Force End All My Live Streams</>
              )}
            </Button>
          </div>
        )}
        <div className="max-w-4xl mx-auto">
          {!isLive ? (
            <Card className="border-0 shadow-glow bg-gradient-card animate-scale-in">
              <CardHeader>
                <CardTitle className="text-3xl bg-gradient-hero bg-clip-text text-transparent">
                  Start Your Live Stream
                </CardTitle>
                <CardDescription>
                  Choose your streaming source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={streamMode} onValueChange={(v) => setStreamMode(v as 'browser' | 'pull' | 'youtube' | 'twitch' | 'tiktok')}>
                  <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="browser">
                      <Video className="h-4 w-4 mr-2" />
                      Browser
                    </TabsTrigger>
                    <TabsTrigger value="youtube">
                      <Youtube className="h-4 w-4 mr-2" />
                      YouTube
                    </TabsTrigger>
                    <TabsTrigger value="twitch">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                      </svg>
                      Twitch
                    </TabsTrigger>
                    <TabsTrigger value="tiktok">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </TabsTrigger>
                    <TabsTrigger value="pull">
                      Pull
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="browser">
                    <form onSubmit={handleStartStream} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Stream Title</Label>
                        <Input
                          id="title"
                          placeholder="What are you streaming today?"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Tell viewers what to expect..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                        />
                      </div>

                      {/* Recording Options */}
                      <Card className="border-muted bg-muted/20">
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="enable-recording" className="text-base">
                                Record Stream
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Save your stream for viewers to watch later
                              </p>
                            </div>
                            <Switch
                              id="enable-recording"
                              checked={enableRecording}
                              onCheckedChange={setEnableRecording}
                            />
                          </div>

                          {enableRecording && (
                            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
                              <div className="space-y-0.5">
                                <Label htmlFor="save-to-storj" className="text-sm">
                                  Save to Storj (Decentralized)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Permanently store on decentralized storage
                                </p>
                              </div>
                              <Switch
                                id="save-to-storj"
                                checked={saveToStorj}
                                onCheckedChange={setSaveToStorj}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-hero hover:opacity-90"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Stream...
                          </>
                        ) : (
                          <>
                            <Video className="mr-2 h-5 w-5" />
                            Start Browser Stream
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="youtube" className="space-y-6">
                    <Card className="border-muted bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="yt-link">Your YouTube Live Stream Link</Label>
                          <Input
                            id="yt-link"
                            placeholder="https://youtube.com/live/zd3AAZhxI7M"
                            value={youtubeVideoId}
                            onChange={(e) => {
                              const url = e.target.value;
                              // Extract video ID from various YouTube URL formats
                              const match = url.match(/(?:youtube\.com\/live\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
                              if (match) {
                                setYoutubeVideoId(match[1]);
                              } else {
                                setYoutubeVideoId(url);
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Paste your YouTube live stream link. Your stream will be embedded here with tip buttons.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="yt-title">Display Title (optional)</Label>
                          <Input
                            id="yt-title"
                            placeholder="Give it a title for CrabbyTV"
                            value={youtubeStreamTitle}
                            onChange={(e) => setYoutubeStreamTitle(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (!youtubeVideoId) {
                              toast({
                                title: 'Missing Link',
                                description: 'Please paste your YouTube live stream link',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setIsLive(true);
                            setTitle(youtubeStreamTitle || 'Live on YouTube');
                            toast({
                              title: 'YouTube Embed Active',
                              description: 'Your stream is now showing with tip buttons',
                            });
                          }}
                          className="w-full bg-gradient-hero hover:opacity-90"
                          disabled={!youtubeVideoId}
                        >
                          <Youtube className="mr-2 h-5 w-5" />
                          Show My YouTube Stream
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="twitch" className="space-y-6">
                    <TwitchConnect />
                    
                    <Card className="border-muted bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="twitch-channel">Your Twitch Channel Name</Label>
                          <Input
                            id="twitch-channel"
                            placeholder="yourchannelname"
                            value={twitchChannel}
                            onChange={(e) => setTwitchChannel(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Just your channel name, not the full URL. Twitch embeds work great!
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="twitch-title">Display Title (optional)</Label>
                          <Input
                            id="twitch-title"
                            placeholder="Give it a title for CrabbyTV"
                            value={twitchTitle}
                            onChange={(e) => setTwitchTitle(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (!twitchChannel) {
                              toast({
                                title: 'Missing Channel',
                                description: 'Please enter your Twitch channel name',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setIsLive(true);
                            setTitle(twitchTitle || `${twitchChannel} on Twitch`);
                            toast({
                              title: 'Twitch Embed Active',
                              description: 'Your stream is now embedded with tip buttons',
                            });
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          disabled={!twitchChannel}
                        >
                          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                          </svg>
                          Embed My Twitch Stream
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tiktok" className="space-y-6">
                    <Card className="border-muted bg-muted/20">
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="tiktok-username">Your TikTok Username</Label>
                          <Input
                            id="tiktok-username"
                            placeholder="@yourusername"
                            value={tiktokUsername}
                            onChange={(e) => {
                              const val = e.target.value.replace('@', '');
                              setTiktokUsername(val);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            TikTok doesn't allow embeds, but viewers can watch on TikTok and tip here!
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tiktok-title">Display Title (optional)</Label>
                          <Input
                            id="tiktok-title"
                            placeholder="Give it a title for CrabbyTV"
                            value={tiktokTitle}
                            onChange={(e) => setTiktokTitle(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (!tiktokUsername) {
                              toast({
                                title: 'Missing Username',
                                description: 'Please enter your TikTok username',
                                variant: 'destructive',
                              });
                              return;
                            }
                            setIsLive(true);
                            setTitle(tiktokTitle || `@${tiktokUsername} on TikTok`);
                            toast({
                              title: 'TikTok Link Active',
                              description: 'Viewers can watch on TikTok and tip here',
                            });
                          }}
                          className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
                          disabled={!tiktokUsername}
                        >
                          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          Show TikTok Link
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="pull" className="space-y-6">
                    <Tabs defaultValue="youtube" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="youtube">
                          <Youtube className="h-4 w-4 mr-2" />
                          YouTube
                        </TabsTrigger>
                        <TabsTrigger value="tiktok">
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          TikTok
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="youtube" className="mt-4">
                        <YouTubeConnect
                          onSelectStream={(streamUrl) => {
                            setPullStreamUrl(streamUrl);
                            toast({
                              title: 'Stream selected',
                              description: 'Fill in details below and click Start Pull Stream',
                            });
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="tiktok" className="mt-4">
                        <TikTokConnect
                          onSelectStream={(streamUrl) => {
                            setPullStreamUrl(streamUrl);
                            toast({
                              title: 'Stream selected',
                              description: 'Fill in details below and click Start Pull Stream',
                            });
                          }}
                        />
                      </TabsContent>
                    </Tabs>

                    <form onSubmit={handleStartPullStream} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="pull-title">Stream Title</Label>
                        <Input
                          id="pull-title"
                          placeholder="What are you streaming?"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pull-description">Description</Label>
                        <Textarea
                          id="pull-description"
                          placeholder="Tell viewers about this stream..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pull-url">Stream URL (RTMP or HLS)</Label>
                        <Input
                          id="pull-url"
                          placeholder="rtmp://... or https://.../playlist.m3u8"
                          value={pullStreamUrl}
                          onChange={(e) => setPullStreamUrl(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Select a YouTube stream above or paste any RTMP/HLS URL
                        </p>
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-hero hover:opacity-90"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Starting Pull Stream...
                          </>
                        ) : (
                          <>
                            <Youtube className="mr-2 h-5 w-5" />
                            Start Pull Stream
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {streamMode === 'youtube' && youtubeVideoId ? (
                <>
                  <Card className="border-0 shadow-glow bg-gradient-card">
                    <CardHeader>
                      <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
                        {title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                        Streaming on YouTube
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <YouTubeEmbed videoId={youtubeVideoId} title={title} />
                      <div className="flex gap-2 items-center justify-center">
                        <TipButton 
                          recipientUserId={user.id}
                          recipientUsername={user.email || 'Creator'}
                          recipientWalletAddress={null}
                        />
                        <Button
                          onClick={() => {
                            setIsLive(false);
                            setYoutubeVideoId('');
                            setYoutubeStreamTitle('');
                            toast({
                              title: 'Embed Removed',
                              description: 'Your YouTube embed has been removed from CrabbyTV',
                            });
                          }}
                          variant="destructive"
                          size="lg"
                        >
                          <StopCircle className="mr-2 h-5 w-5" />
                          Stop Showing Stream
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : streamMode === 'twitch' && twitchChannel ? (
                <>
                  <Card className="border-0 shadow-glow bg-gradient-card">
                    <CardHeader>
                      <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
                        {title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></div>
                        Streaming on Twitch
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <TwitchEmbed channelName={twitchChannel} title={title} />
                      <div className="flex gap-2 items-center justify-center">
                        <TipButton 
                          recipientUserId={user.id}
                          recipientUsername={user.email || 'Creator'}
                          recipientWalletAddress={null}
                        />
                        <Button
                          onClick={() => {
                            setIsLive(false);
                            setTwitchChannel('');
                            setTwitchTitle('');
                            toast({
                              title: 'Embed Removed',
                              description: 'Your Twitch embed has been removed from CrabbyTV',
                            });
                          }}
                          variant="destructive"
                          size="lg"
                        >
                          <StopCircle className="mr-2 h-5 w-5" />
                          Stop Showing Stream
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : streamMode === 'tiktok' && tiktokUsername ? (
                <>
                  <Card className="border-0 shadow-glow bg-gradient-card">
                    <CardHeader>
                      <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
                        {title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-2 w-2 rounded-full bg-pink-500 animate-pulse"></div>
                        Streaming on TikTok
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <TikTokEmbed username={tiktokUsername} title={title} />
                      <div className="flex gap-2 items-center justify-center">
                        <TipButton 
                          recipientUserId={user.id}
                          recipientUsername={user.email || 'Creator'}
                          recipientWalletAddress={null}
                        />
                        <Button
                          onClick={() => {
                            setIsLive(false);
                            setTiktokUsername('');
                            setTiktokTitle('');
                            toast({
                              title: 'Link Removed',
                              description: 'Your TikTok link has been removed from CrabbyTV',
                            });
                          }}
                          variant="destructive"
                          size="lg"
                        >
                          <StopCircle className="mr-2 h-5 w-5" />
                          Stop Showing Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {livekitToken && (
                <InstantLiveStreamLiveKit
                  roomToken={livekitToken}
                  onStreamEnd={handleEndStream}
                  onStreamConnected={async () => {
                    console.log('🔴 Stream connected! Recording:', enableRecording, 'Room:', roomName, 'Already started:', recordingStarted);
                    
                    // CRITICAL: Now mark stream as live since broadcaster has published tracks
                    try {
                      const { error: updateError } = await supabase
                        .from("live_streams")
                        .update({ is_live: true })
                        .eq("id", streamId);
                      
                      if (updateError) {
                        console.error('Failed to update stream status:', updateError);
                      } else {
                        console.log('✅ Stream marked as live in database - viewers can now join!');
                      }
                    } catch (err) {
                      console.error('Error updating stream status:', err);
                    }
                    
                    toast({
                      title: "🎉 You're Live!",
                      description: "Viewers can now see your stream",
                    });
                    
                    // CRITICAL FIX: Delay recording start to stabilize broadcaster connection
                    // Starting egress immediately can cause connection issues when viewers join
                    // Wait 3 seconds to ensure broadcaster's connection is stable
                    if (enableRecording && roomName && !recordingStarted) {
                      console.log('📹 Recording will start in 3 seconds to stabilize connection...');
                      
                      // Show early toast so user knows recording is queued
                      toast({
                        title: "Recording Queued",
                        description: "Recording will start in a few seconds once connection stabilizes",
                      });
                      
                      // Delay to let broadcaster connection stabilize before adding egress participant
                      setTimeout(async () => {
                        console.log('📹 Now starting recording...');

                        // Recording is attempted in background - DO NOT block stream
                        // Stream is already live and working. Recording failure should NOT stop the stream.
                        try {
                          const { data: egressData, error: egressError } = await supabase.functions.invoke('livekit-egress', {
                            body: {
                              roomName,
                              streamId,
                            }
                          });

                          console.log('📹 Egress response:', { egressData, egressError });

                          if (egressError || !egressData?.success) {
                            const errorMsg = egressData?.error || egressError?.message || 'Unknown error';
                            console.error('❌ Recording failed (stream continues):', errorMsg);

                            // Check if it's a configuration issue
                            if (egressData?.code === 'STORJ_NOT_CONFIGURED') {
                              toast({
                                title: "Recording Not Available",
                                description: "Storage not configured. Stream is live but won't be recorded. Contact admin to enable recording.",
                                variant: "default",
                              });
                            } else {
                              toast({
                                title: "Recording Failed",
                                description: `Stream is live but recording failed: ${errorMsg}`,
                                variant: "destructive",
                              });
                            }
                          } else {
                            setRecordingStarted(true);
                            const storageLocation = saveToStorj ? "Storj (decentralized)" : "cloud storage";
                            console.log('✅ Recording started:', egressData.egressId);
                            toast({
                              title: "Recording Started",
                              description: `Saving to ${storageLocation}`,
                            });
                          }
                        } catch (error) {
                          console.error('❌ Exception starting recording (stream continues):', error);
                          toast({
                            title: "Recording Unavailable",
                            description: "Your stream is live but recording couldn't start. Stream will continue normally.",
                            variant: "default",
                          });
                        }
                      }, 3000); // 3 second delay to stabilize connection
                    } else if (enableRecording && recordingStarted) {
                      console.log('✅ Recording already started');
                    } else {
                      console.log('⚠️ Recording disabled by user');
                    }
                  }}
                  isLive={isLive}
                />
              )}

              {/* Live Chat */}
              {streamId && (
                <StreamChat 
                  streamId={streamId}
                  currentUserId={user.id}
                  currentUsername={user.email}
                />
              )}

              <Button
                onClick={() => navigate(`/watch/${streamId}`)}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Open Watch Page (Viewer)
              </Button>
              <Button
                onClick={handleEndStream}
                variant="destructive"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Ending Stream...
                  </>
                ) : (
                  <>
                    <StopCircle className="mr-2 h-5 w-5" />
                    End Stream
                  </>
                )}
              </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
