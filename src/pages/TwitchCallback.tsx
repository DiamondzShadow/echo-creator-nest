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
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (!code) {
          toast({ title: 'Twitch', description: 'Missing authorization code', variant: 'destructive' });
          navigate('/live');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({ title: 'Sign in required', description: 'Please log in and try again', variant: 'destructive' });
          navigate('/auth');
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const url = `${supabaseUrl}/functions/v1/twitch-oauth?code=${encodeURIComponent(code)}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to connect');

        toast({ title: 'Twitch Connected', description: `@${data.twitch_username} linked successfully` });
        navigate('/live');
      } catch (e) {
        console.error(e);
        toast({ title: 'Twitch', description: 'Connection failed. Please try again.', variant: 'destructive' });
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
