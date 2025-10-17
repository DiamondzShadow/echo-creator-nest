import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Video, StopCircle, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { LiveStreamPlayer } from "@/components/LiveStreamPlayer";
import { InstantLiveStream } from "@/components/InstantLiveStream";
import { PullStreamSetup } from "@/components/PullStreamSetup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        // Create regular stream (pass isInstant flag for instant streams)
        const result = await supabase.functions.invoke('livepeer-stream', {
          body: { 
            action: 'create',
            isInstant: streamMode === 'instant'
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

  const handleCameraReady = async () => {
    if (streamMode === 'instant' && !isLive && !loading && !autoGoLivePending && !hasAutoStarted) {
      console.log('📹 Camera ready, auto-starting stream...');
      setHasAutoStarted(true);
      setAutoGoLivePending(true);
      // Small delay to ensure UI updates
      setTimeout(async () => {
        await handleStartStream({ preventDefault: () => {} } as React.FormEvent);
        setAutoGoLivePending(false);
      }, 500);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
                      
                      <InstantLiveStream
                        onStreamStart={(key) => setStreamKey(key)}
                        onStreamEnd={handleEndStream}
                        onCameraReady={handleCameraReady}
                        isLive={isLive}
                        streamKey={streamKey}
                        creatorId={user?.id}
                      />

                      {!isLive && (
                        <div className="text-center space-y-2">
                          {loading || autoGoLivePending ? (
                            <>
                              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">
                                Setting up your broadcast...
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Allow camera access to start broadcasting
                            </p>
                          )}
                        </div>
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
              {playbackId && (
                <LiveStreamPlayer 
                  playbackId={playbackId}
                  title={title}
                  isLive={true}
                  viewerId={user?.id}
                />
              )}

              <Card className="border-0 shadow-card">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold mb-4">Stream Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Stream Server</Label>
                      <div className="bg-muted p-3 rounded-lg">
                        <code className="text-sm">rtmp://rtmp.livepeer.com/live</code>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Stream Key</Label>
                      <div className="flex gap-2">
                        <div className="bg-muted p-3 rounded-lg flex-1 overflow-x-auto">
                          <code className="text-sm">{streamKey}</code>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyStreamKey}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use this with OBS, Streamlabs, or any RTMP-compatible streaming software
                      </p>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm">
                        <span className="font-medium">Title:</span> {title}
                      </p>
                      {description && (
                        <p className="text-sm mt-2">
                          <span className="font-medium">Description:</span> {description}
                        </p>
                      )}
                      <p className="text-sm mt-2">
                        <span className="font-medium">Status:</span>{" "}
                        <span className="text-green-500 font-bold">● LIVE</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
