import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import LiveStreamCard from "@/components/LiveStreamCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandBanner } from "@/components/BrandBanner";

interface Profile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface LiveStream {
  id: string;
  user_id: string;
  is_live: boolean;
  started_at: string;
  ended_at: string | null;
  livepeer_playback_id: string | null;
  created_at: string;
  title?: string;
  profiles?: Profile | null;
}

interface Asset {
  id: string;
  user_id: string | null;
  status: string;
  livepeer_playback_id: string | null;
  created_at: string;
  title?: string | null;
  description?: string | null;
}

const Discover = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [allStreams, setAllStreams] = useState<LiveStream[]>([]);
  const [recordings, setRecordings] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreams();

    // Subscribe to realtime updates for both streams and assets
    const streamsChannel = supabase
      .channel("live_streams_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    const assetsChannel = supabase
      .channel("assets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assets",
        },
        () => {
          fetchStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streamsChannel);
      supabase.removeChannel(assetsChannel);
    };
  }, []);

  const fetchStreams = async () => {
    // Filter out stale lives older than 30 minutes
    const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Fetch live streams (only those currently live with valid playback IDs)
    const { data: live, error: liveError } = await supabase
      .from("live_streams")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("is_live", true)
      .is("ended_at", null)
      .gt("started_at", threshold)
      .not("livepeer_playback_id", "is", null)
      .order("started_at", { ascending: false });

    if (liveError) {
      console.error('Error fetching live streams:', liveError);
    }

    // Fetch all streams - exclude ended LiveKit instant streams (they're not playable recordings)
    const { data: allData } = await supabase
      .from("live_streams")
      .select("*, profiles(username, display_name, avatar_url)")
      .not("livepeer_playback_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter out ended instant streams (LiveKit rooms that can't be replayed)
    const all = allData?.filter(stream => {
      const isInstantStream = stream.livepeer_playback_id?.startsWith('stream-');
      // Keep live instant streams, but exclude ended ones (no recordings)
      return stream.is_live || !isInstantStream;
    }).slice(0, 20) || [];

    // Fetch ready recordings from assets table (only public videos)
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("*")
      .eq("status", "ready")
      .eq("is_public", true)
      .not("livepeer_playback_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
    }

    // Remove duplicates from live streams based on user_id
    // Keep only the most recent live stream per user
    const uniqueLiveStreams = live?.reduce((acc: LiveStream[], stream) => {
      const existingStream = acc.find(s => s.user_id === stream.user_id);
      if (!existingStream) {
        acc.push(stream);
      } else if (new Date(stream.started_at) > new Date(existingStream.started_at)) {
        // Replace with newer stream
        const index = acc.indexOf(existingStream);
        acc[index] = stream;
      }
      return acc;
    }, []) || [];

    console.log('Fetched streams:', { 
      live: live?.length, 
      uniqueLive: uniqueLiveStreams.length,
      all: all?.length,
      recordings: assets?.length
    });
    
    setLiveStreams(uniqueLiveStreams);
    setAllStreams(all || []);
    setRecordings(assets || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />
      <div className="container px-4 pt-24 pb-16">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
          Discover Creators
        </h1>
        <p className="text-muted-foreground">
          Watch live streams and explore amazing content
        </p>
      </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="live">
              Live Now {liveStreams.length > 0 && `(${liveStreams.length})`}
            </TabsTrigger>
            <TabsTrigger value="recordings">
              Recordings {recordings.length > 0 && `(${recordings.length})`}
            </TabsTrigger>
            <TabsTrigger value="all">All Recordings</TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading streams...</p>
              </div>
            ) : liveStreams.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No live streams at the moment</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-scale-in">
                {liveStreams.map((stream) => {
                  const profiles = stream.profiles || { username: 'Unknown', display_name: 'Unknown', avatar_url: null };
                  return (
                    <LiveStreamCard key={stream.id} stream={{ ...stream, title: stream.title || 'Untitled Stream', description: stream.title || '', profiles }} />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recordings">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading recordings...</p>
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No recordings available yet</p>
                <p className="text-sm text-muted-foreground mt-2">Recordings will appear here after streams end</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-scale-in">
                {recordings.map((asset) => {
                  // Build profile object from asset data
                  const assetProfile = asset.user_id 
                    ? { 
                        username: 'creator', 
                        display_name: asset.title?.substring(0, 20) || 'Creator',
                        avatar_url: null 
                      }
                    : null;
                  
                  return (
                    <LiveStreamCard 
                      key={asset.id} 
                      stream={{ ...asset, title: asset.title || 'Untitled', description: asset.description || asset.title || '', profiles: assetProfile }} 
                      isRecording={true}
                      isOwner={false}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading recordings...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-scale-in">
                {recordings.map((asset) => {
                  const assetProfile = asset.user_id 
                    ? { 
                        username: 'creator', 
                        display_name: asset.title?.substring(0, 20) || 'Creator',
                        avatar_url: null 
                      }
                    : null;
                  return (
                    <LiveStreamCard 
                      key={asset.id} 
                      stream={{ ...asset, title: asset.title || 'Untitled', description: asset.description || asset.title || '', profiles: assetProfile }} 
                      isRecording={true}
                      isOwner={false}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Discover;
