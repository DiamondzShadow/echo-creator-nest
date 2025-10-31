import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Loader2, Users, Music } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import SoundCloudWidget from './SoundCloudWidget';

interface LivepeerBroadcasterProps {
  streamKey: string;
  ingestUrl: string;
  playbackId: string;
  onStreamEnd: () => void;
  onStreamConnected?: () => void;
  isLive: boolean;
  creatorId?: string;
}

export const LivepeerBroadcaster = ({ 
  streamKey, 
  ingestUrl,
  playbackId,
  onStreamEnd, 
  onStreamConnected,
  isLive,
  creatorId 
}: LivepeerBroadcasterProps) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [musicVolume, setMusicVolume] = useState(70);
  const [voiceVolume, setVoiceVolume] = useState(100);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  // Setup audio visualization
  const setupAudioVisualization = async (stream: MediaStream) => {
    try {
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

  // Initialize media stream
  useEffect(() => {
    let mounted = true;

    const initStream = async () => {
      try {
        console.log('🎥 Requesting camera and microphone access...');
        setIsConnecting(true);
        setError(null);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        // Attach to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio visualization
        await setupAudioVisualization(stream);

        setIsConnecting(false);
        setIsStreaming(true);

        // Notify parent that stream is ready
        if (onStreamConnected) {
          onStreamConnected();
        }

        toast({
          title: '🎉 Ready to stream!',
          description: 'Your broadcast is live on Livepeer',
        });

      } catch (err) {
        console.error('❌ Failed to access media devices:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setError(errorMsg);
        setIsConnecting(false);
        
        toast({
          title: 'Media access failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    };

    initStream();

    // Cleanup
    return () => {
      mounted = false;
      console.log('🧹 Cleaning up media stream...');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle video toggle
  const handleVideoToggle = () => {
    if (!mediaStreamRef.current) return;
    
    const videoTracks = mediaStreamRef.current.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = !isVideoEnabled;
    });
    setIsVideoEnabled(!isVideoEnabled);
  };

  // Handle audio toggle
  const handleAudioToggle = () => {
    if (!mediaStreamRef.current) return;
    
    const audioTracks = mediaStreamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !isAudioEnabled;
    });
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Handle stop streaming
  const handleStop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsStreaming(false);
    setAudioLevel(0);
    
    onStreamEnd();
  };

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isConnecting ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Accessing camera and microphone...</p>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <p className="text-destructive font-medium mb-2">Media Access Error</p>
                <p className="text-sm text-muted-foreground text-center">{error}</p>
              </div>
            ) : isStreaming ? (
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

                {/* Live indicator & streaming info */}
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

                {/* Stream Key Info */}
                <div className="absolute bottom-20 left-4 right-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 z-10">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">RTMP URL:</span>
                      <code className="ml-2 text-primary">{ingestUrl}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stream Key:</span>
                      <code className="ml-2 text-primary">{streamKey}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Playback ID:</span>
                      <code className="ml-2 text-primary">{playbackId}</code>
                    </div>
                    <p className="text-muted-foreground mt-2">
                      Use these credentials with OBS, Streamlabs, or any RTMP broadcaster
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground">Stream stopped</p>
              </div>
            )}
          </div>

          {/* Controls */}
          {isStreaming && (
            <div className="flex gap-2 justify-center">
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="icon"
                onClick={handleVideoToggle}
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </Button>
              
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="icon"
                onClick={handleAudioToggle}
              >
                {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleStop}
              >
                Stop
              </Button>
            </div>
          )}

          {/* Music Player Section */}
          {isStreaming && (
            <Card className="border-0 shadow-card mt-4">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Background Music
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMusicPlayer(!showMusicPlayer)}
                  >
                    {showMusicPlayer ? 'Hide' : 'Add Music'}
                  </Button>
                </div>

                {showMusicPlayer && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <Label htmlFor="soundcloud">SoundCloud Track URL</Label>
                      <Input
                        id="soundcloud"
                        placeholder="https://soundcloud.com/..."
                        value={soundcloudUrl}
                        onChange={(e) => setSoundcloudUrl(e.target.value)}
                      />
                    </div>

                    {soundcloudUrl && (
                      <div className="space-y-4">
                        <SoundCloudWidget 
                          url={soundcloudUrl}
                          autoPlay={true}
                          visual={false}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Music Volume: {musicVolume}%</Label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={musicVolume}
                              onChange={(e) => setMusicVolume(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Voice Volume: {voiceVolume}%</Label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={voiceVolume}
                              onChange={(e) => setVoiceVolume(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
