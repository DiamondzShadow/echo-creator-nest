import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Video, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  viewer_count: number;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const LiveStreamNotification = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchLiveStreams();

    // Subscribe to realtime updates for new live streams
    const channel = supabase
      .channel('live_stream_notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: 'is_live=eq.true',
        },
        (payload) => {
          console.log('Stream went live:', payload);
          fetchLiveStreams();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_streams',
        },
        () => {
          fetchLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user?.id || null);
  };

  const fetchLiveStreams = async () => {
    try {
      // Fetch currently live streams
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, title, user_id, viewer_count, profiles(username, display_name, avatar_url)')
        .eq('is_live', true)
        .is('ended_at', null)
        .not('livepeer_playback_id', 'is', null)
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching live streams:', error);
        return;
      }

      // Filter out streams from current user and dismissed streams
      const filtered = (data || []).filter(stream => 
        stream.user_id !== currentUser && !dismissed.has(stream.id)
      );

      setLiveStreams(filtered);
    } catch (error) {
      console.error('Error in fetchLiveStreams:', error);
    }
  };

  const handleDismiss = (streamId: string) => {
    setDismissed(prev => new Set([...prev, streamId]));
    setLiveStreams(prev => prev.filter(s => s.id !== streamId));
  };

  const handleWatch = (streamId: string) => {
    navigate(`/watch/${streamId}`);
  };

  if (liveStreams.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 animate-slide-down">
      {liveStreams.map((stream) => (
        <div
          key={stream.id}
          className="bg-red-500 text-white py-3 px-4 shadow-lg border-b-2 border-red-600"
        >
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Video className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm sm:text-base">LIVE NOW</span>
              </div>
              
              <Avatar className="w-8 h-8 ring-2 ring-white flex-shrink-0">
                <AvatarImage src={stream.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-red-700 text-white text-xs">
                  {stream.profiles?.display_name?.[0]?.toUpperCase() || 'L'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm sm:text-base">
                  {stream.profiles?.display_name || stream.profiles?.username || 'Unknown'} is streaming
                </p>
                <p className="text-xs sm:text-sm truncate opacity-90">
                  {stream.title}
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-sm flex-shrink-0">
                <Eye className="w-4 h-4" />
                <span>{stream.viewer_count}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleWatch(stream.id)}
                className="bg-white text-red-600 hover:bg-gray-100 font-bold"
              >
                Watch
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(stream.id)}
                className="text-white hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
