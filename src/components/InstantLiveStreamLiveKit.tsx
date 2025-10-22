import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Loader2, Monitor, Users, Music } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Room, RoomEvent, Track, LocalVideoTrack, RemoteParticipant } from 'livekit-client';
import { createLiveKitRoom, toggleCamera, toggleMicrophone, disconnectFromRoom } from '@/lib/livekit-config';
import { Badge } from '@/components/ui/badge';
import SoundCloudWidget from './SoundCloudWidget';

interface InstantLiveStreamLiveKitProps {
  roomToken: string;
  onStreamEnd: () => void;
  onStreamConnected?: () => void;
  isLive: boolean;
  creatorId?: string;
}

export const InstantLiveStreamLiveKit = ({ 
  roomToken, 
  onStreamEnd, 
  onStreamConnected,
  isLive,
  creatorId 
}: InstantLiveStreamLiveKitProps) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [musicVolume, setMusicVolume] = useState(70);
  const [voiceVolume, setVoiceVolume] = useState(100);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  // Setup audio visualization
  const setupAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }
  };

  // Connect to LiveKit room
  useEffect(() => {
    if (!roomToken) return;

    let mounted = true;
    let connectedRoom: Room | null = null;

    const connect = async () => {
      try {
        console.log('🔌 Connecting to LiveKit room...');
        setIsConnecting(true);
        setError(null);

        // Create and connect to room
        const newRoom = await createLiveKitRoom(roomToken);
        connectedRoom = newRoom;

        if (!mounted) {
          await newRoom.disconnect();
          return;
        }

        setRoom(newRoom);
        setIsConnected(true);
        setIsConnecting(false);

        console.log('✅ Connected to LiveKit room:', newRoom.name);

        // Setup room event handlers
        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('🔌 Room disconnected');
          setIsConnected(false);
        });

        // Track participant joins/leaves for viewer count (non-intrusive)
        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('👤 Viewer joined:', participant.identity);
          // Update viewer count without interrupting stream
          setTimeout(() => {
            if (mounted && connectedRoom) {
              setViewerCount(connectedRoom.remoteParticipants.size);
            }
          }, 100);
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log('👤 Viewer left:', participant.identity);
          // Update viewer count without interrupting stream
          setTimeout(() => {
            if (mounted && connectedRoom) {
              setViewerCount(connectedRoom.remoteParticipants.size);
            }
          }, 100);
        });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log('📤 Local track published:', publication.trackName);
        });

        // Publish camera and microphone
        console.log('📹 Publishing camera and microphone...');
        await newRoom.localParticipant.setCameraEnabled(true);
        await newRoom.localParticipant.setMicrophoneEnabled(true);

        // Attach video track to video element
        const videoPublication = Array.from(newRoom.localParticipant.videoTrackPublications.values())[0];
        if (videoPublication?.track && videoRef.current) {
          (videoPublication.track as LocalVideoTrack).attach(videoRef.current);
        }

        // Setup audio visualization
        await setupAudioVisualization();

        // CRITICAL: Only call onStreamConnected after tracks are successfully published
        console.log('✅ Tracks published successfully, triggering onStreamConnected callback');
        if (onStreamConnected) {
          onStreamConnected();
        }

        toast({
          title: '🎉 Connected!',
          description: 'Setting up your broadcast...',
        });

      } catch (err: any) {
        console.error('❌ Failed to connect to LiveKit:', err);
        setError(err.message || 'Failed to connect to stream');
        setIsConnecting(false);
        
        toast({
          title: 'Connection failed',
          description: err.message || 'Failed to connect to streaming server',
          variant: 'destructive',
        });
      }
    };

    connect();

    // Cleanup
    return () => {
      mounted = false;
      console.log('🧹 Cleaning up LiveKit connection...');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (connectedRoom) {
        connectedRoom.disconnect();
      }
    };
  }, [roomToken]);

  // Handle video toggle
  const handleVideoToggle = async () => {
    if (!room) return;
    
    try {
      await toggleCamera(room, !isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  };

  // Handle audio toggle
  const handleAudioToggle = async () => {
    if (!room) return;
    
    try {
      await toggleMicrophone(room, !isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    } catch (err) {
      console.error('Failed to toggle audio:', err);
    }
  };

  // Handle screen share toggle
  const handleScreenShareToggle = async () => {
    if (!room) return;
    
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        toast({
          title: 'Screen sharing stopped',
        });
      } else {
        // Start screen sharing
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        toast({
          title: 'Screen sharing started',
          description: 'Your screen is now visible to viewers',
        });
      }
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
      toast({
        title: 'Screen share failed',
        description: err instanceof Error ? err.message : 'Could not share screen',
        variant: 'destructive',
      });
    }
  };

  // Handle stop streaming
  const handleStop = async () => {
    if (!room) return;
    
    try {
      console.log('🛑 Stopping stream...');
      await disconnectFromRoom(room);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      setRoom(null);
      setIsConnected(false);
      setAudioLevel(0);
      
      onStreamEnd();
    } catch (err) {
      console.error('Failed to stop stream:', err);
    }
  };

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isConnecting ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Connecting to stream...</p>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <p className="text-destructive font-medium mb-2">Connection Error</p>
                <p className="text-sm text-muted-foreground text-center">{error}</p>
              </div>
            ) : isConnected ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Mirror for better UX
                />

                {/* Audio Level Indicator */}
                {audioLevel > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Mic className="w-4 h-4 text-foreground" />
                        <div className="flex-1">
                          <Progress 
                            value={audioLevel} 
                            className="h-2"
                          />
                        </div>
                        <span className="text-xs font-mono text-foreground">
                          {Math.round(audioLevel)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live indicator & viewer count */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  {isLive && (
                    <Badge className="bg-destructive text-destructive-foreground px-3 py-1 text-sm font-bold shadow-glow">
                      <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse mr-2"></span>
                      LIVE
                    </Badge>
                  )}
                  <Badge className="bg-background/80 backdrop-blur-sm ml-auto">
                    <Users className="w-3 h-3 mr-1" />
                    {viewerCount} watching
                  </Badge>
                </div>

                {/* Screen sharing indicator */}
                {isScreenSharing && (
                  <div className="absolute top-16 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold z-10">
                    <Monitor className="w-3 h-3 inline mr-1" />
                    Sharing Screen
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Stream disconnected</p>
              </div>
            )}
          </div>

          {/* Controls */}
          {isConnected && (
            <div className="flex gap-2 justify-center">
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="icon"
                onClick={handleVideoToggle}
                disabled={!isConnected}
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="icon"
                onClick={handleAudioToggle}
                disabled={!isConnected}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>

              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="icon"
                onClick={handleScreenShareToggle}
                disabled={!isConnected}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleStop}
                disabled={!isConnected}
              >
                Stop
              </Button>
            </div>
          )}

          {/* Music Player Section */}
          {isConnected && (
            <Card className="border-0 shadow-card mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2 text-lg">
                    <Music className="w-5 h-5 text-primary" />
                    Music Player
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                  >
                    {showMusicPlayer ? 'Hide' : 'Show'} Player
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Play music during your stream - viewers will hear it when you enable "Share Tab Audio" in screen sharing
                </p>

                {showMusicPlayer && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="soundcloud-url">SoundCloud Track/Playlist URL</Label>
                      <Input
                        id="soundcloud-url"
                        placeholder="https://soundcloud.com/artist/track"
                        value={soundcloudUrl}
                        onChange={(e) => setSoundcloudUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste any public SoundCloud track or playlist URL
                      </p>
                    </div>

                    {soundcloudUrl && (
                      <div className="space-y-4">
                        <SoundCloudWidget 
                          url={soundcloudUrl} 
                          visual={false}
                          autoPlay={false}
                        />
                        
                        <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                          <div className="text-sm font-semibold mb-2">Audio Mix Guide</div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="music-volume" className="flex items-center justify-between text-sm">
                              <span>🎵 Music Volume (for you)</span>
                              <span className="text-muted-foreground font-mono">{musicVolume}%</span>
                            </Label>
                            <input
                              id="music-volume"
                              type="range"
                              min={0}
                              max={100}
                              value={musicVolume}
                              onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="voice-volume" className="flex items-center justify-between text-sm">
                              <span>🎤 Your Volume (for balance)</span>
                              <span className="text-muted-foreground font-mono">{voiceVolume}%</span>
                            </Label>
                            <input
                              id="voice-volume"
                              type="range"
                              min={0}
                              max={100}
                              value={voiceVolume}
                              onChange={(e) => setVoiceVolume(parseInt(e.target.value))}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>

                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs">
                            <p className="font-semibold mb-1">💡 Pro Tip:</p>
                            <p className="text-muted-foreground">
                              To share music with viewers, click "Share Screen" above and select the browser tab with this music player. 
                              Make sure to check "Share tab audio" in the screen share dialog!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status message */}
          {isConnecting && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Setting up your broadcast...
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
