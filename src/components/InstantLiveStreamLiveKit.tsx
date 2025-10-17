import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Room, RoomEvent, Track, LocalVideoTrack } from 'livekit-client';
import { createLiveKitRoom, toggleCamera, toggleMicrophone, disconnectFromRoom } from '@/lib/livekit-config';

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
        newRoom.on(RoomEvent.Connected, () => {
          console.log('📡 Room connected event');
          if (onStreamConnected) {
            onStreamConnected();
          }
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('🔌 Room disconnected');
          setIsConnected(false);
        });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log('📤 Local track published:', publication.trackName);
        });

        newRoom.on(RoomEvent.TrackSubscribed, (track) => {
          console.log('📥 Track subscribed:', track.kind);
          
          // Attach local video to video element
          if (track.kind === Track.Kind.Video && track instanceof LocalVideoTrack && videoRef.current) {
            track.attach(videoRef.current);
          }
        });

        // Publish camera and microphone
        console.log('📹 Publishing camera and microphone...');
        await newRoom.localParticipant.setCameraEnabled(true);
        await newRoom.localParticipant.setMicrophoneEnabled(true);

        // Attach video track to video element
        const videoTrack = newRoom.localParticipant.videoTracks.values().next().value?.track;
        if (videoTrack && videoRef.current) {
          videoTrack.attach(videoRef.current);
        }

        // Setup audio visualization
        await setupAudioVisualization();

        toast({
          title: '🎉 Live!',
          description: 'You are now broadcasting to your audience',
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

                {/* Live indicator */}
                {isLive && (
                  <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse z-10">
                    <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                    LIVE
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
                variant="destructive"
                onClick={handleStop}
                disabled={!isConnected}
              >
                Stop
              </Button>
            </div>
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
