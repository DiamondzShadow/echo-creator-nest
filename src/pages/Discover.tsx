import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import LiveStreamCard from "@/components/LiveStreamCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Discover = () => {
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [allStreams, setAllStreams] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
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
    // Fetch live streams (only those with valid playback IDs)
    const { data: live } = await supabase
      .from("live_streams")
      .select("*, profiles(username, display_name, avatar_url)")
      .eq("is_live", true)
      .not("livepeer_playback_id", "is", null)
      .order("started_at", { ascending: false });

    // Fetch ALL streams (including those without playback IDs for debugging)
    const { data: all } = await supabase
      .from("live_streams")
      .select("*, profiles(username, display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(20);

    console.log('Fetched streams:', { live, all });
    setLiveStreams(live || []);
    setAllStreams(all || []);
    setRecordings([]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-24 pb-16">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
          Discover Creators
        </h1>
        <p className="text-muted-foreground">
          Watch live streams and explore amazing content
        </p>
        <p className="text-xs text-muted-foreground mt-2">Note: Showing all streams for debugging, including ones without playback IDs.</p>
      </div>

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="live">
              Live Now {liveStreams.length > 0 && `(${liveStreams.length})`}
            </TabsTrigger>
            <TabsTrigger value="recordings">
              Recordings {recordings.length > 0 && `(${recordings.length})`}
            </TabsTrigger>
            <TabsTrigger value="all">All Streams</TabsTrigger>
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
                {liveStreams.map((stream) => (
                  <LiveStreamCard key={stream.id} stream={stream} />
                ))}
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
                {recordings.map((asset) => (
                  <LiveStreamCard key={asset.id} stream={asset} isRecording={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading streams...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-scale-in">
                {allStreams.map((stream) => (
                  <LiveStreamCard key={stream.id} stream={stream} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Discover;
