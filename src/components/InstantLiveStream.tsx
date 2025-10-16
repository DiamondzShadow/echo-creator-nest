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
  isLive: boolean;
  streamKey?: string;
}

export const InstantLiveStream = ({ onStreamStart, onStreamEnd, isLive, streamKey }: InstantLiveStreamProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

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
  };

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  // Enable broadcasting when streamKey is provided and isLive is true
  const broadcastEnabled = isStreaming && streamKey && isLive;
  const ingestUrl = broadcastEnabled ? getIngest(streamKey) : undefined;

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isStreaming ? (
              <Broadcast.Root
                ingestUrl={ingestUrl}
                aspectRatio={16/9}
                video={isVideoEnabled}
                audio={isAudioEnabled}
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
                onClick={() => {
                  setIsStreaming(true);
                  toast({
                    title: 'Camera ready',
                    description: 'Your camera and microphone are active',
                  });
                }}
                className="bg-gradient-hero hover:opacity-90"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Camera
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
            <p className="text-sm text-center text-muted-foreground">
              Click "Go Live" at the top to start broadcasting
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
