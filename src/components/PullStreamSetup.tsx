import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PullStreamSetupProps {
  onPullUrlChange: (url: string) => void;
  pullUrl: string;
}

export const PullStreamSetup = ({ onPullUrlChange, pullUrl }: PullStreamSetupProps) => {
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (url: string) => {
    onPullUrlChange(url);
    if (url && !validateUrl(url)) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid stream URL',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardContent className="pt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="pull-url">External Stream URL</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
            >
              <Info className="w-4 h-4 mr-1" />
              Help
            </Button>
          </div>
          <Input
            id="pull-url"
            placeholder="rtmp://... or https://..."
            value={pullUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Enter an RTMP or HLS stream URL from YouTube, Twitch, TikTok, or any streaming platform
          </p>
        </div>

        {showHelp && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-3 text-sm">
              <div>
                <strong className="block mb-1">How to get your stream URL:</strong>
              </div>
              
              <div>
                <strong className="text-purple-400">YouTube Live:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Start a live stream on YouTube</li>
                  <li>In YouTube Studio, go to stream settings</li>
                  <li>Copy the "Stream URL" (rtmp://...) OR</li>
                  <li>Use the public HLS URL: https://www.youtube.com/watch?v=VIDEO_ID</li>
                </ol>
              </div>

              <div>
                <strong className="text-blue-400">Twitch:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Go to your Twitch channel while live</li>
                  <li>The public HLS URL is available via Twitch API</li>
                  <li>Or use your RTMP ingest URL: rtmp://live.twitch.tv/app/YOUR_STREAM_KEY</li>
                </ol>
              </div>

              <div>
                <strong className="text-pink-400">TikTok Live:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Start a TikTok Live stream via OBS</li>
                  <li>Use the same RTMP URL you're streaming to</li>
                </ol>
              </div>

              <div>
                <strong className="text-orange-400">Instagram Live:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Use third-party tools to get RTMP URL</li>
                  <li>Note: IG has restrictions on re-streaming</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-border">
                <strong>Supported formats:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>RTMP: rtmp://server/path/streamkey</li>
                  <li>RTMPS: rtmps://server/path/streamkey</li>
                  <li>HLS: https://server/path/playlist.m3u8</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">How this works:</p>
              <p className="text-xs text-muted-foreground">
                We'll pull your stream from the external platform and re-broadcast it through Livepeer.
                This allows you to stream to multiple platforms simultaneously and take advantage of
                decentralized streaming infrastructure.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
