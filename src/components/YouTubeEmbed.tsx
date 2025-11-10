import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play } from "lucide-react";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

export const YouTubeEmbed = ({ videoId, title }: YouTubeEmbedProps) => {
  const youtubeUrl = `https://youtube.com/live/${videoId}`;
  
  return (
    <Card className="w-full overflow-hidden bg-gradient-to-br from-red-500/10 to-background border-red-500/20">
      <CardContent className="p-8 text-center space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-red-500">
            <Play className="h-8 w-8 fill-current" />
            <span className="text-sm font-medium uppercase tracking-wide">Live on YouTube</span>
          </div>
          <h3 className="text-2xl font-bold">{title || 'Watch Stream'}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            YouTube doesn't allow browser-based streams to be embedded. Click below to watch on YouTube, then come back to tip!
          </p>
        </div>
        
        <div className="relative w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-lg" />
          <div className="relative z-10 text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <Play className="h-8 w-8 text-red-500 fill-current" />
            </div>
            <p className="text-muted-foreground">Stream is live on YouTube</p>
          </div>
        </div>

        <Button 
          onClick={() => window.open(youtubeUrl, '_blank')}
          size="lg"
          className="w-full bg-red-500 hover:bg-red-600"
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          Watch on YouTube
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Tip buttons below work while you're watching on YouTube!
        </p>
      </CardContent>
    </Card>
  );
};
