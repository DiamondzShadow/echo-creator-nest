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
  started_at: string | null;
  updated_at: string;
}

export const LiveStreamNotification = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchLiveStreams();

    // Subscribe to realtime updates for live streams
    const channel = supabase
      .channel('live_stream_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
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
    const uid = session?.user?.id || null;
    setCurrentUser(uid);
    // Refetch after we know who the current user is to avoid showing their own banner
    fetchLiveStreams(uid);
  };

  const fetchLiveStreams = async (uid?: string | null) => {
    try {
      // Fetch currently live streams
      const { data, error } = await supabase
        .from('live_streams')
        .select('id, title, user_id, viewer_count, started_at, updated_at, profiles(username, display_name, avatar_url)')
        .eq('is_live', true)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching live streams:', error);
        return;
      }

      const currentUid = uid ?? currentUser;

      // Filter out streams from current user and dismissed users, and stale entries
      const now = Date.now();
      const FRESH_MS = 10 * 60 * 1000; // 10 minutes freshness window
      const filtered = (data || []).filter(stream => {
        const updatedAtMs = stream.updated_at ? new Date(stream.updated_at).getTime() : 0;
        const isFresh = now - updatedAtMs < FRESH_MS;
        const notSelf = stream.user_id !== currentUid;
        const notDismissed = !dismissed.has(stream.user_id);
        // Only show if recently updated OR has viewers
        const active = isFresh || (stream.viewer_count ?? 0) > 0;
        return notSelf && notDismissed && active;
      });

      // Deduplicate by streamer (user_id), keep the most recent by started_at
      const byUser = new Map<string, LiveStream>();
      for (const s of filtered) {
        const prev = byUser.get(s.user_id);
        const prevTime = prev?.started_at ? new Date(prev.started_at).getTime() : 0;
        const curTime = s.started_at ? new Date(s.started_at).getTime() : 0;
        if (!prev || curTime >= prevTime) byUser.set(s.user_id, s);
      }

      setLiveStreams(Array.from(byUser.values()));
    } catch (error) {
      console.error('Error in fetchLiveStreams:', error);
    }
  };

  const handleDismiss = (userId: string) => {
    setDismissed(prev => new Set([...prev, userId]));
    setLiveStreams(prev => prev.filter(s => s.user_id !== userId));
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
                onClick={() => handleDismiss(stream.user_id)}
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
