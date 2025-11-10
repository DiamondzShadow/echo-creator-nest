import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TikTokStream {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  status: string;
  watchUrl: string;
  liveUrl: string | null;
  rtmpUrl: string | null;
}

interface TikTokConnectProps {
  onSelectStream?: (streamUrl: string) => void;
}

export const TikTokConnect = ({ onSelectStream }: TikTokConnectProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<TikTokStream[]>([]);
  const [fetchingStreams, setFetchingStreams] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    
    // Check if redirected back from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('tiktok') === 'connected') {
      toast({
        title: 'TikTok Connected!',
        description: 'You can now pull streams from your TikTok account',
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
        .eq('platform', 'tiktok')
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
          description: 'Log in to connect your TikTok account.',
          variant: 'destructive',
        });
        setLoading(false);
        window.location.href = '/auth';
        return;
      }

      const { data, error } = await supabase.functions.invoke('tiktok-oauth', {
        body: { action: 'authorize' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Failed to connect TikTok:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect TikTok',
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
          description: 'Log in to disconnect your TikTok account.',
          variant: 'destructive',
        });
        setLoading(false);
        window.location.href = '/auth';
        return;
      }

      const { error } = await supabase.functions.invoke('tiktok-oauth', {
        body: { action: 'disconnect' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      setIsConnected(false);
      setStreams([]);
      toast({
        title: 'TikTok Disconnected',
        description: 'Your TikTok account has been disconnected',
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect TikTok',
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
          description: 'Log in to view your TikTok content.',
          variant: 'destructive',
        });
        setFetchingStreams(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('tiktok-streams', {
        body: {},
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      setStreams(data.streams || []);
      
      if (data.note) {
        toast({
          title: 'TikTok Live Access Required',
          description: data.note,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to fetch streams:', error);
      toast({
        title: 'Failed to fetch content',
        description: error instanceof Error ? error.message : 'Could not load your TikTok content',
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
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            Connect TikTok
          </CardTitle>
          <CardDescription>
            Connect your TikTok account to pull your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              TikTok Live streaming requires additional API approval from TikTok. You can connect your account now and access your videos.
            </AlertDescription>
          </Alert>
          <Button onClick={handleConnect} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                Connect TikTok Account
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
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              TikTok Connected
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
          View your TikTok content
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
            'Refresh Content'
          )}
        </Button>

        {streams.length === 0 && !fetchingStreams && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No content found. Make sure you have videos on your TikTok account.
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(stream.watchUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on TikTok
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
