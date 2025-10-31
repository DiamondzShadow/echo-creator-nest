import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactionOverlay from '@/components/ReactionOverlay';
import { Users } from 'lucide-react';

interface LivepeerViewerProps {
  playbackId: string;
  title?: string;
  isLive?: boolean;
  viewerCount?: number;
}

export const LivepeerViewer = ({ playbackId, title, isLive = false, viewerCount = 0 }: LivepeerViewerProps) => {
  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <div className="relative">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          <div className="relative w-full h-full group">
            {/* Livepeer HLS Player */}
            <video
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              src={`https://livepeer.studio/api/playback/${playbackId}/index.m3u8`}
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
