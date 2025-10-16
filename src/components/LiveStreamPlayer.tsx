import { Card } from '@/components/ui/card';
import * as Player from '@livepeer/react/player';
import { getSrc } from '@livepeer/react/external';
import { useEffect, useState } from 'react';
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveStreamPlayerProps {
  playbackId: string;
  title?: string;
  isLive?: boolean;
}

export const LiveStreamPlayer = ({ playbackId, title, isLive = false }: LiveStreamPlayerProps) => {
  const [src, setSrc] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlaybackInfo = async () => {
      try {
        setIsLoading(true);
        // Fetch playback info through our backend function
        const { data, error } = await supabase.functions.invoke('livepeer-playback', {
          body: { playbackId }
        });

        if (error) {
          console.error('Failed to fetch playback info:', error);
          setIsLoading(false);
          return;
        }

        console.log('Playback info:', data);
        
        // Use getSrc to parse the playback sources
        const sources = getSrc(data);
        console.log('Parsed sources:', sources);
        setSrc(sources);
      } catch (error) {
        console.error('Error fetching playback info:', error);
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
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : src && src.length > 0 ? (
            <Player.Root src={src} autoPlay={isLive} lowLatency={isLive}>
              <Player.Container className="w-full h-full">
                <Player.Video 
                  title={title || 'Live stream'}
                  className="w-full h-full object-cover"
                />

                <Player.LoadingIndicator className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </Player.LoadingIndicator>

                {/* Live indicator */}
                {isLive && (
                  <div className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse">
                    <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                    LIVE
                  </div>
                )}

                {/* Custom controls */}
                <Player.Controls className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-3">
                    <Player.PlayPauseTrigger className="text-white hover:text-primary transition-colors">
                      <Player.PlayingIndicator asChild matcher={false}>
                        <Play className="w-6 h-6 fill-current" />
                      </Player.PlayingIndicator>
                      <Player.PlayingIndicator asChild>
                        <Pause className="w-6 h-6 fill-current" />
                      </Player.PlayingIndicator>
                    </Player.PlayPauseTrigger>

                    <Player.Time className="text-white text-sm font-mono" />

                    <Player.Seek className="flex-1 mx-4">
                      <Player.Track className="bg-white/30 h-1 rounded-full relative">
                        <Player.SeekBuffer className="absolute h-full bg-white/50 rounded-full" />
                        <Player.Range className="absolute h-full bg-primary rounded-full" />
                      </Player.Track>
                    </Player.Seek>

                    <Player.MuteTrigger className="text-white hover:text-primary transition-colors">
                      <Player.VolumeIndicator asChild matcher={false}>
                        <VolumeX className="w-5 h-5" />
                      </Player.VolumeIndicator>
                      <Player.VolumeIndicator asChild matcher={true}>
                        <Volume2 className="w-5 h-5" />
                      </Player.VolumeIndicator>
                    </Player.MuteTrigger>

                    <Player.FullscreenTrigger className="text-white hover:text-primary transition-colors">
                      <Maximize className="w-5 h-5" />
                    </Player.FullscreenTrigger>
                  </div>
                </Player.Controls>
              </Player.Container>
            </Player.Root>
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
