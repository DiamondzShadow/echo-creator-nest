import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import * as Broadcast from '@livepeer/react/broadcast';
import { getIngest } from '@livepeer/react/external';

interface InstantLiveStreamProps {
  onStreamStart: (streamKey: string) => void;
  onStreamEnd: () => void;
  onCameraReady?: () => void;
  isLive: boolean;
  streamKey?: string;
  creatorId?: string;
}

export const InstantLiveStream = ({ onStreamStart, onStreamEnd, onCameraReady, isLive, streamKey, creatorId }: InstantLiveStreamProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Handle broadcast errors
  const handleBroadcastError = (error: { type: string; message: string } | null) => {
    if (error) {
      console.error('🚨 Broadcast error:', error);
      setBroadcastError(error.message);
      toast({
        title: 'Broadcast Error',
        description: error.message || 'An error occurred while broadcasting',
        variant: 'destructive',
      });
    } else {
      // Error resolved
      if (broadcastError) {
        console.log('✅ Broadcast error resolved');
        setBroadcastError(null);
      }
    }
  };

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

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
  };

  const stopStreaming = () => {
    console.log('🛑 Stopping broadcast and cleaning up...');
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
    setIsStreaming(false);
    setPermissionsGranted(false);
    setBroadcastError(null);
    
    console.log('✅ Broadcast stopped and cleaned up');
  };

  // Auto-request camera permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (requestingPermissions || permissionsGranted) return;
      
      setRequestingPermissions(true);
      try {
        console.log('🎥 Requesting camera and microphone permissions...');
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Stop tracks immediately (Broadcast will manage its own)
        media.getTracks().forEach((t) => t.stop());
        
        setPermissionsGranted(true);
        setIsStreaming(true);
        await setupAudioVisualization();
        
        toast({
          title: 'Camera ready',
          description: 'Creating your stream and going live...',
        });
        
        // Notify parent that camera is ready - this will trigger auto Go Live
        if (onCameraReady) {
          onCameraReady();
        }
      } catch (err: unknown) {
        console.error('❌ Media permissions error:', err);
        setPermissionsGranted(false);
        toast({
          title: 'Camera access needed',
          description: 'Please allow camera and microphone access to use instant streaming. Check your browser permissions.',
          variant: 'destructive',
        });
      } finally {
        setRequestingPermissions(false);
      }
    };

    requestPermissions();

    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      stopStreaming();
    };
  }, []);

  // Watch for isLive prop changes to detect when parent ends the stream
  useEffect(() => {
    if (!isLive && isStreaming) {
      console.log('⚠️ Stream ended by parent, stopping broadcast...');
      stopStreaming();
    }
  }, [isLive]);

  // Enable broadcasting when we have a streamKey and camera is active
  const broadcastEnabled = isStreaming && !!streamKey;
  const ingestUrl = broadcastEnabled ? getIngest(streamKey as string) : undefined;
  
  // Use streamKey + timestamp as key to force re-mount when it changes
  // This ensures Broadcast component fully reinitializes with new ingestUrl
  const [broadcastKey, setBroadcastKey] = useState('preview');

  useEffect(() => {
    if (streamKey) {
      // Force remount when streamKey becomes available
      setBroadcastKey(`broadcast-${streamKey}-${Date.now()}`);
      console.log('✅ Stream key received, forcing Broadcast remount');
    }
  }, [streamKey]);

  useEffect(() => {
    if (broadcastEnabled && ingestUrl) {
      console.log('🔴 Broadcasting enabled with ingestUrl:', ingestUrl);
      console.log('🎥 Stream Key:', streamKey?.substring(0, 20) + '...');
      console.log('📡 Broadcast should start in ~5-10 seconds');
    }
  }, [broadcastEnabled, ingestUrl, streamKey]);

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isStreaming ? (
              <Broadcast.Root
                key={broadcastKey}
                ingestUrl={ingestUrl}
                aspectRatio={16/9}
                video={isVideoEnabled ? {
                  width: {
                    ideal: 1920,
                    max: 1920,
                  },
                  height: {
                    ideal: 1080,
                    max: 1080,
                  },
                  frameRate: 30,
                } : false}
                audio={isAudioEnabled}
                onError={(error) => {
                  console.error('❌ Broadcast error:', error);
                }}
                timeout={15000}
                hotkeys={true}
              >
                <Broadcast.Container className="w-full h-full">
                  <Broadcast.Video 
                    className="w-full h-full object-cover" 
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  
                  <Broadcast.LoadingIndicator className="absolute inset-0 flex items-center justify-center bg-background/80">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </Broadcast.LoadingIndicator>

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
                  
                  {isLive && (
                    <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse z-10">
                      <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                  )}
                </Broadcast.Container>
              </Broadcast.Root>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Camera preview will appear here</p>
                  <p className="text-xs text-muted-foreground mt-2">Click Start Camera below</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            {!isStreaming ? (
              <Button
                onClick={async () => {
                  setRequestingPermissions(true);
                  try {
                    console.log('🎥 Requesting camera and microphone permissions...');
                    const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    media.getTracks().forEach((t) => t.stop());

                    setPermissionsGranted(true);
                    setIsStreaming(true);
                    await setupAudioVisualization();

                    toast({
                      title: 'Camera ready',
                      description: 'Creating your stream and going live...',
                    });
                    
                    // Notify parent that camera is ready
                    if (onCameraReady) {
                      onCameraReady();
                    }
                  } catch (err: unknown) {
                    console.error('❌ Media permissions error:', err);
                    setPermissionsGranted(false);
                    toast({
                      title: 'Camera access needed',
                      description: 'Please allow camera and microphone access. Check your browser permissions (lock icon in address bar).',
                      variant: 'destructive',
                    });
                  } finally {
                    setRequestingPermissions(false);
                  }
                }}
                disabled={requestingPermissions}
                className="bg-gradient-hero hover:opacity-90"
              >
                {requestingPermissions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Requesting Permissions...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Start Camera
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="icon"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    stopStreaming();
                    if (isLive) {
                      onStreamEnd();
                    }
                  }}
                >
                  Stop
                </Button>
              </>
            )}
          </div>

          {isStreaming && !isLive && (
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Preparing your broadcast...
              </p>
            </div>
          )}
          
          {!isStreaming && !permissionsGranted && !requestingPermissions && (
            <div className="text-center space-y-2">
              <p className="text-sm text-destructive font-medium">
                Camera access is required for instant streaming
              </p>
              <p className="text-xs text-muted-foreground">
                Click "Start Camera" and allow access when prompted
              </p>
            </div>
          )}

          {broadcastError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ {broadcastError}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
