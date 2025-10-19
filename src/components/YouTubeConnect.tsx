import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Youtube, ExternalLink, LogOut, Loader2 } from 'lucide-react';

interface YouTubeStream {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  status: string;
  watchUrl: string;
  liveUrl: string;
  rtmpUrl: string | null;
}

interface YouTubeConnectProps {
  onSelectStream?: (streamUrl: string) => void;
}

export const YouTubeConnect = ({ onSelectStream }: YouTubeConnectProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<YouTubeStream[]>([]);
  const [fetchingStreams, setFetchingStreams] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    
    // Check if redirected back from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('youtube') === 'connected') {
      toast({
        title: 'YouTube Connected!',
        description: 'You can now pull streams from your YouTube channel',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'youtube')
        .maybeSingle();

      if (!error && data) {
        setIsConnected(true);
        fetchStreams();
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast({
          title: 'Please sign in',
          description: 'Log in to connect your YouTube account.',
          variant: 'destructive',
        });
        setLoading(false);
        // Redirect to auth
        window.location.href = '/auth';
        return;
      }

      const { data, error } = await supabase.functions.invoke('youtube-oauth', {
        body: { action: 'authorize' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Failed to connect YouTube:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect YouTube',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast({
          title: 'Not signed in',
          description: 'Log in to disconnect your YouTube account.',
          variant: 'destructive',
        });
        setLoading(false);
        window.location.href = '/auth';
        return;
      }

      const { error } = await supabase.functions.invoke('youtube-oauth', {
        body: { action: 'disconnect' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      setIsConnected(false);
      setStreams([]);
      toast({
        title: 'YouTube Disconnected',
        description: 'Your YouTube account has been disconnected',
      });
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Disconnect Failed',
        description: error.message || 'Failed to disconnect YouTube',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStreams = async () => {
    try {
      setFetchingStreams(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast({
          title: 'Please sign in',
          description: 'Log in to view your YouTube live streams.',
          variant: 'destructive',
        });
        setFetchingStreams(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('youtube-streams', {
        body: {},
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      setStreams(data.streams || []);
      
      if (data.streams?.length === 0) {
        toast({
          title: 'No Active Streams',
          description: 'Start a live stream on YouTube first',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch streams:', error);
      toast({
        title: 'Failed to fetch streams',
        description: error.message || 'Could not load your YouTube streams',
        variant: 'destructive',
      });
    } finally {
      setFetchingStreams(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-glow bg-gradient-card">
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-0 shadow-glow bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Connect YouTube
          </CardTitle>
          <CardDescription>
            Connect your YouTube account to automatically pull your live streams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Youtube className="mr-2 h-4 w-4" />
                Connect YouTube Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              YouTube Connected
            </CardTitle>
            <Badge variant="outline" className="text-green-500 border-green-500">
              Active
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={loading}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Select a live stream to re-broadcast through Livepeer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={fetchStreams} disabled={fetchingStreams} variant="outline" className="w-full">
          {fetchingStreams ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh Streams'
          )}
        </Button>

        {streams.length === 0 && !fetchingStreams && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active streams found. Start a live stream on YouTube first.
          </p>
        )}

        {streams.map((stream) => (
          <Card key={stream.id} className="overflow-hidden">
            {stream.thumbnail && (
              <img
                src={stream.thumbnail}
                alt={stream.title}
                className="w-full h-32 object-cover"
              />
            )}
            <CardContent className="p-4 space-y-2">
              <h4 className="font-semibold line-clamp-2">{stream.title}</h4>
              {stream.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{stream.description}</p>
              )}
              <div className="space-y-2">
                {!stream.rtmpUrl && (
                  <p className="text-xs text-amber-500">
                    ⚠️ This stream uses WebRTC. To pull it, go to YouTube Studio → Stream Settings → Change stream type to "RTMP"
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (!stream.rtmpUrl) {
                        toast({
                          title: 'RTMP not enabled',
                          description: 'This stream uses WebRTC. Change your YouTube stream settings to RTMP to pull it.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      onSelectStream?.(stream.rtmpUrl);
                    }}
                    className="flex-1"
                    size="sm"
                    disabled={!stream.rtmpUrl}
                  >
                    Use This Stream
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(stream.watchUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
