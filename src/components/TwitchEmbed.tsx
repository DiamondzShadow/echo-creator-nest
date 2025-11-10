import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";

interface TwitchEmbedProps {
  channelName: string;
  title?: string;
}

// Declare Twitch Embed types
declare global {
  interface Window {
    Twitch: any;
  }
}

export const TwitchEmbed = ({ channelName, title }: TwitchEmbedProps) => {
  const embedRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!channelName || !containerRef.current) return;

    // Load Twitch Embed script
    const script = document.createElement('script');
    script.src = 'https://embed.twitch.tv/embed/v1.js';
    script.async = true;
    
    script.onload = () => {
      try {
        const parentDomains = [
          window.location.hostname,
          'lovable.app',
          'lovableproject.com',
          'crabbytv.com',
          'localhost'
        ].filter(Boolean);

        embedRef.current = new window.Twitch.Embed(containerRef.current, {
          width: '100%',
          height: '100%',
          channel: channelName,
          layout: 'video',
          autoplay: true,
          muted: false,
          parent: parentDomains,
        });

        embedRef.current.addEventListener(window.Twitch.Embed.VIDEO_READY, () => {
          console.log('Twitch player ready');
          setIsLoading(false);
          setError(null);
        });

        embedRef.current.addEventListener(window.Twitch.Embed.VIDEO_PLAY, () => {
          console.log('Twitch stream playing');
        });

      } catch (err) {
        console.error('Error initializing Twitch embed:', err);
        setError('Failed to load Twitch stream. The channel might be offline.');
        setIsLoading(false);
      }
    };

    script.onerror = () => {
      setError('Failed to load Twitch player');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      if (embedRef.current) {
        try {
          embedRef.current.destroy();
        } catch (e) {
          console.error('Error destroying Twitch embed:', e);
        }
      }
      document.body.removeChild(script);
    };
  }, [channelName]);

  const twitchUrl = `https://twitch.tv/${channelName}`;

  return (
    <Card className="w-full overflow-hidden">
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(twitchUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Watch on Twitch
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-purple-500">Loading Twitch stream...</div>
          </div>
        )}
        <div 
          ref={containerRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </Card>
  );
};
