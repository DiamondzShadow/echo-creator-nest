import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2, XCircle } from "lucide-react";

interface TwitchConnection {
  twitch_username: string;
  twitch_user_id: string;
}

export const TwitchConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<TwitchConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    
    // Handle OAuth callback
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const fromTwitch = params.get('from') === 'twitch';
      
      if (code && fromTwitch) {
        await handleOAuthCallback(code);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    
    handleCallback();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('twitch_connections')
        .select('twitch_username, twitch_user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsConnected(true);
        setConnection(data);
      }
    } catch (error) {
      console.error('Error checking Twitch connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const callbackUrl = `${supabaseUrl}/functions/v1/twitch-oauth?code=${encodeURIComponent(code)}`;

      const response = await fetch(callbackUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect');
      }

      const data = await response.json();

      setIsConnected(true);
      setConnection({
        twitch_username: data.twitch_username,
        twitch_user_id: data.twitch_user_id,
      });

      toast({
        title: "Connected to Twitch!",
        description: `Your Twitch account @${data.twitch_username} is now connected.`,
      });
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: "Connection failed",
        description: "Failed to connect your Twitch account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
    const redirectUri = 'https://crabbytv.com/live?from=twitch';
    const scope = 'user:read:email channel:read:stream_key';
    
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const disconnectUrl = `${supabaseUrl}/functions/v1/twitch-oauth?action=disconnect`;

      const response = await fetch(disconnectUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setIsConnected(false);
      setConnection(null);

      toast({
        title: "Disconnected",
        description: "Your Twitch account has been disconnected.",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect your Twitch account.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              Twitch
              {isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            {isConnected && connection ? (
              <div className="text-sm text-muted-foreground">
                Connected as @{connection.twitch_username}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Not connected
              </div>
            )}
          </div>
        </div>
        
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect
          </Button>
        )}
      </div>
    </Card>
  );
};
