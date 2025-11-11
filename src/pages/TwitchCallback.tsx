import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TwitchCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const run = async () => {
      try {
        console.log('Twitch OAuth callback - starting...');
        
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        
        console.log('OAuth params:', { 
          hasCode: !!code, 
          error, 
          errorDescription,
          fullUrl: window.location.href 
        });
        
        if (error) {
          console.error('Twitch OAuth error:', error, errorDescription);
          toast({ 
            title: 'Twitch Authorization Failed', 
            description: errorDescription || error, 
            variant: 'destructive' 
          });
          navigate('/live');
          return;
        }
        
        if (!code) {
          console.error('No authorization code in callback URL');
          toast({ title: 'Twitch', description: 'Missing authorization code', variant: 'destructive' });
          navigate('/live');
          return;
        }

        console.log('Checking user session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No user session found');
          toast({ title: 'Sign in required', description: 'Please log in and try again', variant: 'destructive' });
          navigate('/auth');
          return;
        }

        console.log('Session found, calling edge function...');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const url = `${supabaseUrl}/functions/v1/twitch-oauth?code=${encodeURIComponent(code)}`;
        
        console.log('Calling:', url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        
        console.log('Edge function response status:', res.status);
        const data = await res.json();
        console.log('Edge function response data:', data);
        
        if (!res.ok) {
          console.error('Edge function error:', data);
          throw new Error(data?.error || `Failed to connect (${res.status})`);
        }

        console.log('Twitch connected successfully:', data.twitch_username);
        toast({ title: 'Twitch Connected', description: `@${data.twitch_username} linked successfully` });
        navigate('/live');
      } catch (e) {
        console.error('Twitch OAuth callback error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Connection failed. Please try again.';
        toast({ title: 'Twitch Connection Error', description: errorMessage, variant: 'destructive' });
        navigate('/live');
      }
    };
    run();
  }, [navigate, toast]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
      Completing Twitch connection...
    </div>
  );
};

export default TwitchCallback;
