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
import { Video, StopCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { InstantLiveStreamLiveKit } from "@/components/InstantLiveStreamLiveKit";
import { StreamChat } from "@/components/StreamChat";
import { BrandBanner } from "@/components/BrandBanner";
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
                  Stream directly from your browser - no software needed!
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        Create Stream
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
