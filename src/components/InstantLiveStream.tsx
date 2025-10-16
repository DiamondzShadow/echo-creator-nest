import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Video, VideoOff, Mic, MicOff, Loader2 } from 'lucide-react';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

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
      }

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
                  className="w-full h-full object-cover"
                />
                {isLive && (
                  <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse">
                    <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                    LIVE
                  </div>
                )}
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