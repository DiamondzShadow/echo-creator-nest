import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Video, StopCircle, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { LiveStreamPlayer } from "@/components/LiveStreamPlayer";
import { InstantLiveStreamLiveKit } from "@/components/InstantLiveStreamLiveKit";
import { LiveKitViewer } from "@/components/LiveKitViewer";
import { PullStreamSetup } from "@/components/PullStreamSetup";
import { StreamChat } from "@/components/StreamChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandBanner } from "@/components/BrandBanner";

const Live = () => {
  const [user, setUser] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState<string>("");
  const [playbackId, setPlaybackId] = useState<string>("");
  const [pullUrl, setPullUrl] = useState<string>("");
  const [streamMode, setStreamMode] = useState<"instant" | "software" | "pull">("instant");
  const [copied, setCopied] = useState(false);
  const [autoGoLivePending, setAutoGoLivePending] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [enableRecording, setEnableRecording] = useState(true);
  const [saveToStorj, setSaveToStorj] = useState(false);
  const [recordingStarted, setRecordingStarted] = useState(false);
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

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For instant streaming, use LiveKit instead of Livepeer
      if (streamMode === 'instant') {
        console.log('Creating LiveKit room for instant streaming...');
        
        // Generate unique room name
        const roomId = `stream-${user.id}-${Date.now()}`;
        setRoomName(roomId);

        // First create stream record in database
        const { data, error } = await supabase
          .from("live_streams")
          .insert({
            user_id: user.id,
            title: title.trim().substring(0, 200),
            description: description?.trim().substring(0, 2000),
            is_live: true,
            started_at: new Date().toISOString(),
            livepeer_stream_id: roomId, // Use room ID as identifier
            livepeer_playback_id: roomId, // Use same for viewer access
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
          description: "Your instant stream is ready to broadcast!",
        });
      } else if (streamMode === 'software' || streamMode === 'pull') {
        // For software/pull streaming, use existing Livepeer flow
        console.log('Creating Livepeer stream...');
        
        let livepeerData, livepeerError;
        
        // Check if this is a pull stream
        if (streamMode === 'pull' && pullUrl) {
          // Create pull stream
          const result = await supabase.functions.invoke('livepeer-pull-stream', {
            body: { 
              action: 'create',
              pullUrl: pullUrl
            }
          });
          livepeerData = result.data;
          livepeerError = result.error;
          console.log('Pull stream response:', { livepeerData, livepeerError });
        } else {
          // Create regular stream
          const result = await supabase.functions.invoke('livepeer-stream', {
            body: { 
              action: 'create',
            }
          });
          livepeerData = result.data;
          livepeerError = result.error;
          console.log('Regular stream response:', { livepeerData, livepeerError });
        }

        if (livepeerError) {
          console.error('Livepeer error:', livepeerError);
          throw new Error(`Livepeer API error: ${livepeerError.message || 'Unknown error'}`);
        }

        if (!livepeerData || !livepeerData.streamId || !livepeerData.streamKey || !livepeerData.playbackId) {
          console.error('Invalid Livepeer response:', livepeerData);
          throw new Error('Invalid response from Livepeer API - missing required fields');
        }

        const { streamId: lpStreamId, streamKey: lpStreamKey, playbackId: lpPlaybackId } = livepeerData;

        console.log('Storing stream in database...');
        // Store stream in public table (without stream_key)
        const { data, error } = await supabase
          .from("live_streams")
          .insert({
            user_id: user.id,
            title: title.trim().substring(0, 200),
            description: description?.trim().substring(0, 2000),
            is_live: true,
            started_at: new Date().toISOString(),
            livepeer_stream_id: lpStreamId,
            livepeer_playback_id: lpPlaybackId,
          })
          .select()
          .single();

        if (error) {
          console.error('Database error:', error);
          throw new Error(`Failed to save stream: ${error.message}`);
        }

        // Store stream key securely using database function
        const { error: keyError } = await supabase.rpc('store_stream_key', {
          p_stream_id: data.id,
          p_stream_key: lpStreamKey,
        });

        if (keyError) {
          console.error('Stream key storage error:', keyError);
          throw new Error(`Failed to save stream credentials: ${keyError.message}`);
        }

        console.log('Stream created successfully:', data);
        setStreamId(data.id);
        setStreamKey(lpStreamKey);
        setPlaybackId(lpPlaybackId);
        setIsLive(true);
        
        const streamTypeMessage = streamMode === 'pull' 
          ? "Your pull stream is active and re-broadcasting!" 
          : "Your stream is ready. Start broadcasting to go live!";
        
        toast({
          title: "Stream created!",
          description: streamTypeMessage,
        });
      }
    } catch (error: any) {
      console.error('Stream creation error:', error);
      toast({
        title: "Failed to create stream",
        description: error.message || "Please check console for details",
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
      
      const { error } = await supabase
        .from("live_streams")
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq("id", streamId);

      if (error) {
        console.error('Error ending stream:', error);
        throw error;
      }

      console.log('✅ Stream ended successfully in database');

      // Clean up all state
      setIsLive(false);
      setStreamId(null);
      setStreamKey("");
      setPlaybackId("");
      setTitle("");
      setDescription("");
      setPullUrl("");
      setHasAutoStarted(false);
      setAutoGoLivePending(false);
      setLivekitToken("");
      setRoomName("");
      
      toast({
        title: "Stream ended",
        description: "Your live stream has been ended.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyStreamKey = () => {
    navigator.clipboard.writeText(streamKey);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Stream key copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };


  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />
      <div className="container px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          {!isLive ? (
            <Card className="border-0 shadow-glow bg-gradient-card animate-scale-in">
              <CardHeader>
                <CardTitle className="text-3xl bg-gradient-hero bg-clip-text text-transparent">
                  Start Your Live Stream
                </CardTitle>
                <CardDescription>
                  Choose how you want to stream
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="instant" className="w-full" onValueChange={(value) => setStreamMode(value as any)}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="instant">
                      <Video className="w-4 h-4 mr-2" />
                      Instant Stream
                    </TabsTrigger>
                    <TabsTrigger value="software">
                      <Video className="w-4 h-4 mr-2" />
                      Streaming Software
                    </TabsTrigger>
                    <TabsTrigger value="pull">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Pull Stream
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="instant" className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">Go Live Instantly</h3>
                      <p className="text-sm text-muted-foreground">
                        Stream directly from your browser - no software needed!
                      </p>
                    </div>
                    
                    <form onSubmit={handleStartStream} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title-instant">Stream Title</Label>
                        <Input
                          id="title-instant"
                          placeholder="What are you streaming today?"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description-instant">Description</Label>
                        <Textarea
                          id="description-instant"
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
                      
                      {livekitToken ? (
                        <InstantLiveStreamLiveKit
                          roomToken={livekitToken}
                          onStreamEnd={handleEndStream}
                          onStreamConnected={async () => {
                            toast({
                              title: "Connected!",
                              description: "You're now live",
                            });
                            
                            // Start recording if enabled
                            if (enableRecording && roomName && !recordingStarted) {
                              try {
                                const { data: egressData, error: egressError } = await supabase.functions.invoke('livekit-egress', {
                                  body: {
                                    roomName,
                                    streamId,
                                  }
                                });
                                
                                if (egressError || !egressData?.success) {
                                  console.error('Failed to start recording:', egressError || egressData);
                                  toast({
                                    title: "Recording Warning",
                                    description: "Stream is live but recording may not have started",
                                    variant: "destructive",
                                  });
                                } else {
                                  setRecordingStarted(true);
                                  const storageLocation = saveToStorj ? "Storj (decentralized)" : "cloud storage";
                                  toast({
                                    title: "Recording Started",
                                    description: `Recording ID: ${egressData.egressId || 'N/A'} → ${storageLocation}`,
                                  });
                                }
                              } catch (error) {
                                console.error('Error starting recording:', error);
                              }
                            }
                          }}
                          isLive={isLive}
                          creatorId={user?.id}
                        />
) : (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          <p>Fill in stream details above and click "Go Live Now"</p>
                        </div>
                      )}

                      {isLive && enableRecording && !recordingStarted && roomName && (
                              try {
                                const { data: egressData, error } = await supabase.functions.invoke('livekit-egress', {
                                  body: { roomName, streamId }
                                });
                                if (error || !egressData?.success) {
                                  console.error('Manual recording start failed:', error || egressData);
                                  toast({
                                    title: 'Could not start recording',
                                    description: 'Please try again or continue streaming without recording',
                                    variant: 'destructive',
                                  });
                                } else {
                                  setRecordingStarted(true);
                                  toast({
                                    title: 'Recording Started',
                                    description: `Recording ID: ${egressData.egressId || 'N/A'}`,
                                  });
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                          >
                            Start Recording
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">If recording doesn’t start automatically, click here.</p>
                        </div>
                      )}

                      {!isLive && (
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full bg-gradient-hero hover:opacity-90 text-lg"
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
                              Go Live Now
                            </>
                          )}
                        </Button>
                      )}
                    </form>
                  </TabsContent>

                  <TabsContent value="software" className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">Professional Streaming</h3>
                      <p className="text-sm text-muted-foreground">
                        Use OBS, Streamlabs, or other streaming software for advanced features
                      </p>
                    </div>

                    <form onSubmit={handleStartStream} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title-software">Stream Title</Label>
                        <Input
                          id="title-software"
                          placeholder="What are you streaming today?"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description-software">Description</Label>
                        <Textarea
                          id="description-software"
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
                              <Label htmlFor="enable-recording-sw" className="text-base">
                                Record Stream
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Save your stream for viewers to watch later
                              </p>
                            </div>
                            <Switch
                              id="enable-recording-sw"
                              checked={enableRecording}
                              onCheckedChange={setEnableRecording}
                            />
                          </div>

                          {enableRecording && (
                            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
                              <div className="space-y-0.5">
                                <Label htmlFor="save-to-storj-sw" className="text-sm">
                                  Save to Storj (Decentralized)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Permanently store on decentralized storage
                                </p>
                              </div>
                              <Switch
                                id="save-to-storj-sw"
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
                        className="w-full bg-gradient-hero hover:opacity-90 text-lg"
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
                            Create Stream
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="pull" className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">Pull External Stream</h3>
                      <p className="text-sm text-muted-foreground">
                        Re-stream from YouTube, Twitch, TikTok, or any RTMP/HLS source
                      </p>
                    </div>

                    <form onSubmit={handleStartStream} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title-pull">Stream Title</Label>
                        <Input
                          id="title-pull"
                          placeholder="What are you streaming today?"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description-pull">Description</Label>
                        <Textarea
                          id="description-pull"
                          placeholder="Tell viewers what to expect..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                        />
                      </div>
                      
                      <PullStreamSetup 
                        pullUrl={pullUrl}
                        onPullUrlChange={setPullUrl}
                      />

                      {/* Recording Options */}
                      <Card className="border-muted bg-muted/20">
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="enable-recording-pull" className="text-base">
                                Record Stream
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Save your stream for viewers to watch later
                              </p>
                            </div>
                            <Switch
                              id="enable-recording-pull"
                              checked={enableRecording}
                              onCheckedChange={setEnableRecording}
                            />
                          </div>

                          {enableRecording && (
                            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
                              <div className="space-y-0.5">
                                <Label htmlFor="save-to-storj-pull" className="text-sm">
                                  Save to Storj (Decentralized)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Permanently store on decentralized storage
                                </p>
                              </div>
                              <Switch
                                id="save-to-storj-pull"
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
                        className="w-full bg-gradient-hero hover:opacity-90 text-lg"
                        disabled={loading || !pullUrl}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Pull Stream...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 h-5 w-5" />
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
            <div className="space-y-6 animate-fade-in">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {streamMode === 'instant' && livekitToken ? (
                    <InstantLiveStreamLiveKit
                      roomToken={livekitToken}
                      onStreamEnd={handleEndStream}
                      onStreamConnected={() => {
                        toast({ title: 'Connected!', description: "You're now live" });
                      }}
                      isLive={isLive}
                      creatorId={user?.id}
                    />
                  ) : playbackId ? (
                    <LiveStreamPlayer 
                      playbackId={playbackId}
                      title={title}
                      isLive={true}
                      viewerId={user?.id}
                    />
                  ) : null}

                  {streamMode !== 'instant' && (
                    <Card className="border-0 shadow-card">
                      <CardContent className="pt-6">
                        <h3 className="text-xl font-bold mb-4">Stream Configuration</h3>
...
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    onClick={handleEndStream}
                    size="lg"
                    variant="destructive"
                    className="w-full text-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <StopCircle className="mr-2 h-5 w-5" />
                        End Stream
                      </>
                    )}
                  </Button>
                </div>

                {/* Live Chat for Creator */}
                {streamId && (
                  <div className="lg:col-span-1">
                    <div className="h-[calc(100vh-12rem)] sticky top-24">
                      <StreamChat 
                        streamId={streamId}
                        currentUserId={user?.id}
                        currentUsername={user?.email?.split('@')[0] || 'Creator'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
