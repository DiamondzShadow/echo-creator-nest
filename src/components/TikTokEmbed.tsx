import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TikTokEmbedProps {
  username: string;
  title?: string;
}

export const TikTokEmbed = ({ username, title }: TikTokEmbedProps) => {
  const tiktokUrl = `https://www.tiktok.com/@${username}/live`;
  
  return (
    <Card className="w-full overflow-hidden">
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          TikTok doesn't allow live stream embedding. Viewers need to watch on TikTok directly, but can tip here!
        </AlertDescription>
      </Alert>
      
      <CardContent className="p-8 text-center space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            <span className="text-sm font-medium uppercase tracking-wide">Live on TikTok</span>
          </div>
          <h3 className="text-2xl font-bold">{title || `@${username} Live`}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Watch the live stream on TikTok, then come back here to tip!
          </p>
        </div>
        
        <div className="relative w-full aspect-[9/16] max-w-sm mx-auto bg-muted rounded-lg flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-cyan-500/10 rounded-lg" />
          <div className="relative z-10 text-center space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-pink-500/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-muted-foreground">Stream is live on TikTok</p>
          </div>
        </div>

        <Button 
          onClick={() => window.open(tiktokUrl, '_blank')}
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          Watch on TikTok
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Tip buttons below work while you watch on TikTok!
        </p>
      </CardContent>
    </Card>
  );
};
