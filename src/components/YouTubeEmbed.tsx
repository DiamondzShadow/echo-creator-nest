import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubeEmbed = ({ videoId, title }: YouTubeEmbedProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // Load the IFrame Player API code asynchronously
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // API will call this when ready
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube IFrame API ready');
      setIsApiReady(true);
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current || !videoId) return;

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            console.log('Player ready');
            setError(null);
            event.target.playVideo();
          },
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
            let errorMsg = 'Failed to load stream. ';
            switch (event.data) {
              case 2:
                errorMsg += 'Invalid video ID.';
                break;
              case 5:
                errorMsg += 'HTML5 player error.';
                break;
              case 100:
                errorMsg += 'Video not found or private.';
                break;
              case 101:
              case 150:
                errorMsg += 'Embedding disabled by video owner.';
                break;
              default:
                errorMsg += 'Unknown error.';
            }
            setError(errorMsg);
          },
          onStateChange: (event: any) => {
            console.log('Player state:', event.data);
          }
        }
      });
    } catch (err) {
      console.error('Error initializing YouTube player:', err);
      setError('Failed to initialize player');
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [isApiReady, videoId]);

  const youtubeUrl = `https://youtube.com/live/${videoId}`;

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
              onClick={() => window.open(youtubeUrl, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Watch on YouTube
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
        <div 
          ref={containerRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </Card>
  );
};
