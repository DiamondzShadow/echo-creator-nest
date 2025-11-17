import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactionOverlay from '@/components/ReactionOverlay';
import { Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface LivepeerViewerProps {
  playbackId: string;
  title?: string;
  isLive?: boolean;
  viewerCount?: number;
}

export const LivepeerViewer = ({ playbackId, title, isLive = false, viewerCount = 0 }: LivepeerViewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;

    const hlsSource = `https://livepeer.studio/api/playback/${playbackId}/index.m3u8`;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsSource;
      video.load();
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(hlsSource);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('HLS.js error', data);
      });
      return () => {
        hls.destroy();
      };
    } else {
      // Fallback to MP4 proxy if available in the future
      video.src = hlsSource;
    }
  }, [playbackId]);

    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <div className="relative">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          <div className="relative w-full h-full group">
            <video
              ref={videoRef}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Reactions overlay */}
            <ReactionOverlay />

            {/* Live indicator */}
            {isLive && (
              <div className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse">
                <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
                LIVE
              </div>
            )}

            {/* Viewer count */}
            {isLive && (
              <div className="absolute top-4 right-4 z-10">
                <Badge className="bg-background/80 backdrop-blur-sm">
                  <Users className="w-3 h-3 mr-1" />
                  {viewerCount} watching
                </Badge>
              </div>
            )}
          </div>
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
