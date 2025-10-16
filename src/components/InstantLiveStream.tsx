import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface InstantLiveStreamProps {
  onStreamStart: (streamKey: string) => void;
  onStreamEnd: () => void;
  isLive: boolean;
}

export const InstantLiveStream = ({ onStreamStart, onStreamEnd, isLive }: InstantLiveStreamProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  const setupAudioVisualization = (stream: MediaStream) => {
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

  const startCamera = async () => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch(e => console.error('Error playing video:', e));
      }

      // Set up audio visualization
      setupAudioVisualization(stream);

      setIsStreaming(true);
      toast({
        title: 'Camera ready',
        description: 'Your camera and microphone are active',
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast({
        title: 'Camera access denied',
        description: 'Please allow camera and microphone access to stream',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
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
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isStreaming ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {isLive && (
                  <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse z-10">
                    <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                    LIVE
                  </div>
                )}
                
                {/* Audio Level Indicator */}
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
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Camera preview will appear here</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center">
            {!isStreaming ? (
              <Button
                onClick={startCamera}
                className="bg-gradient-hero hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Camera...
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
                    stopCamera();
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
            <p className="text-sm text-center text-muted-foreground">
              Click "Go Live" at the top to start broadcasting
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};