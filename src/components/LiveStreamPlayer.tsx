import { Card } from '@/components/ui/card';
import ReactionOverlay from '@/components/ReactionOverlay';
import * as Player from '@livepeer/react/player';
import { getSrc } from '@livepeer/react/external';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LiveStreamPlayerProps {
  playbackId: string;
  title?: string;
  isLive?: boolean;
  viewerId?: string;
}

export const LiveStreamPlayer = ({ playbackId, title, isLive = false, viewerId }: LiveStreamPlayerProps) => {
  const [src, setSrc] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isDirectUrl, setIsDirectUrl] = useState(false);
  const { toast } = useToast();

  // Handle playback errors with retry logic
  const handlePlaybackError = useCallback((error: { type: string; message: string } | null) => {
    if (error) {
      console.error('🚨 Playback error:', error);
      
      // Special handling for "Stream open failed" - this is normal when broadcast hasn't started
      if (error.message?.includes('Stream open failed') || error.type === 'offline') {
        setPlaybackError('Waiting for broadcast to start...');
        // Don't show toast for expected "not live yet" errors
      } else {
        setPlaybackError(error.message);
        toast({
          title: 'Playback Error',
          description: error.message || 'Unable to play stream. Trying fallback...',
          variant: 'destructive',
        });
      }
    } else {
      // Error resolved
      if (playbackError) {
        console.log('✅ Playback error resolved');
        setPlaybackError(null);
      }
    }
  }, [playbackError, toast]);

  useEffect(() => {
    const fetchPlaybackInfo = async () => {
      try {
        setIsLoading(true);
        setPlaybackError(null);
        
        // Check if playbackId is a direct URL (Storj recording)
        if (playbackId.startsWith('http')) {
          console.log('📹 Direct video URL detected:', playbackId);
          setIsDirectUrl(true);
          setSrc([{ src: playbackId, type: 'video/mp4' }]);
          setIsLoading(false);
          return;
        }

        console.log('🔍 Fetching playback info for:', playbackId);
        
        // Fetch playback info through our backend function for Livepeer
        const { data, error } = await supabase.functions.invoke('livepeer-playback', {
          body: { playbackId }
        });

        if (error) {
          console.error('❌ Failed to fetch playback info:', error);
          setPlaybackError('Failed to load stream');
          setIsLoading(false);
          return;
        }

        console.log('📦 Playback info received:', data);
        
        // Use getSrc to parse the playback sources - prioritize WebRTC for live, HLS for VOD
        const allSources = getSrc(data);
        console.log('🎬 All parsed sources:', allSources);
        
        if (Array.isArray(allSources) && allSources.length > 0) {
          // For live streams, prefer WebRTC for ultra-low latency
          // Player will automatically fallback to HLS if WebRTC fails
          setSrc(allSources);
          console.log('✅ Sources set:', allSources);
        } else {
          console.log('⏳ No sources available yet, retrying...');
          setSrc(null);
          // If not live yet, retry shortly
          setTimeout(fetchPlaybackInfo, 5000);
        }
      } catch (error) {
        console.error('💥 Error fetching playback info:', error);
        setPlaybackError('An error occurred while loading the stream');
      } finally {
        setIsLoading(false);
      }
    };

    if (playbackId) {
      fetchPlaybackInfo();
    }
  }, [playbackId]);

  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <div className="relative">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading stream...</p>
            </div>
          ) : src && src.length > 0 ? (
            <Player.Root 
              src={src} 
              autoPlay={isLive} 
              volume={isLive ? 0 : 1}
              // Enable low latency for live streams with WebRTC fallback to HLS
              lowLatency={isLive}
              viewerId={viewerId}
              onError={handlePlaybackError}
              timeout={20000}
              hotkeys={true}
            >
              <Player.Container className="w-full h-full">
                <Player.Video 
                  title={title || 'Live stream'}
                  className="w-full h-full object-cover"
                />

                {/* Reactions overlay */}
                <ReactionOverlay />

                {/* Loading indicator */}
                <Player.LoadingIndicator asChild matcher={false}>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Buffering...</p>
                    </div>
                  </div>
                </Player.LoadingIndicator>

                {/* Live status indicator with connection quality */}
                {isLive && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-destructive/90 backdrop-blur-sm text-destructive-foreground px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow">
                      <Player.LiveIndicator className="flex items-center gap-2">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>LIVE</span>
                      </Player.LiveIndicator>
                    </div>
                  </div>
                )}

                {/* Enhanced custom controls */}
                <Player.Controls className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <Player.PlayPauseTrigger className="text-white hover:text-primary transition-colors hover:scale-110 duration-200">
                      <Player.PlayingIndicator asChild matcher={false}>
                        <Play className="w-6 h-6 fill-current" />
                      </Player.PlayingIndicator>
                      <Player.PlayingIndicator asChild>
                        <Pause className="w-6 h-6 fill-current" />
                      </Player.PlayingIndicator>
                    </Player.PlayPauseTrigger>

                    {/* Time display */}
                    <Player.Time className="text-white text-sm font-mono" />

                    {/* Progress bar */}
                    <Player.Seek className="flex-1 mx-4 group">
                      <Player.Track className="bg-white/30 h-1.5 rounded-full relative group-hover:h-2 transition-all">
                        <Player.SeekBuffer className="absolute h-full bg-white/40 rounded-full" />
                        <Player.Range className="absolute h-full bg-primary rounded-full shadow-glow" />
                      </Player.Track>
                    </Player.Seek>

                    {/* Volume control */}
                    <Player.MuteTrigger className="text-white hover:text-primary transition-colors hover:scale-110 duration-200">
                      <Player.VolumeIndicator asChild matcher={false}>
                        <VolumeX className="w-5 h-5" />
                      </Player.VolumeIndicator>
                      <Player.VolumeIndicator asChild matcher={true}>
                        <Volume2 className="w-5 h-5" />
                      </Player.VolumeIndicator>
                    </Player.MuteTrigger>

                    {/* Fullscreen */}
                    <Player.FullscreenTrigger className="text-white hover:text-primary transition-colors hover:scale-110 duration-200">
                      <Maximize className="w-5 h-5" />
                    </Player.FullscreenTrigger>
                  </div>
                </Player.Controls>
              </Player.Container>
            </Player.Root>
          ) : playbackError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              {playbackError.includes('Waiting for broadcast') ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary mb-4 animate-spin" />
                  <p className="text-primary font-medium mb-2">Stream Ready</p>
                  <p className="text-sm text-muted-foreground">{playbackError}</p>
                  <p className="text-xs text-muted-foreground mt-2">Start broadcasting to begin the stream</p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                  <p className="text-destructive font-medium mb-2">Playback Error</p>
                  <p className="text-sm text-muted-foreground">{playbackError}</p>
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground">Unable to load stream</p>
            </div>
          )}
        </div>
      </div>
      {title && (
        <div className="p-4">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
      )}
    </Card>
  );
};
