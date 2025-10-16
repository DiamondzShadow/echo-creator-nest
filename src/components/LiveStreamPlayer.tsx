import { Card } from '@/components/ui/card';

interface LiveStreamPlayerProps {
  playbackId: string;
  title?: string;
  isLive?: boolean;
}

export const LiveStreamPlayer = ({ playbackId, title, isLive = false }: LiveStreamPlayerProps) => {
  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <div className="relative">
        {isLive && (
          <div className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-glow animate-pulse">
            <span className="w-2 h-2 bg-destructive-foreground rounded-full animate-pulse"></span>
            LIVE
          </div>
        )}
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <iframe
            src={`https://lvpr.tv/?v=${playbackId}`}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
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