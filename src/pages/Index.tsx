import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { BrandBanner } from "@/components/BrandBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Video, Radio, Users, Play, Eye, Heart, Clock, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  is_live: boolean;
  viewer_count: number;
  started_at: string;
  livepeer_playback_id: string;
}

interface Asset {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  created_at: string;
  status: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [videos, setVideos] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch live streams
      const { data: streams } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('started_at', { ascending: false })
        .limit(4);

      // Fetch recent videos
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(8);

      setLiveStreams(streams || []);
      setVideos(assets || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="container relative px-4 mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Tv className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Welcome to CrabbyTV 🦀</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Your Decentralized Video Platform
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stream, upload, collaborate, and earn crypto tips. All on one unified platform powered by Web3.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/live')} className="bg-gradient-hero">
                <Radio className="mr-2 h-5 w-5" />
                Go Live
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/videos')}>
                <Video className="mr-2 h-5 w-5" />
                Upload Video
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/meet')}>
                <Users className="mr-2 h-5 w-5" />
                Start Meeting
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Now Section */}
      {liveStreams.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Radio className="h-8 w-8 text-red-500 animate-pulse" />
                Live Now
              </h2>
              <Button variant="ghost" onClick={() => navigate('/discover')}>
                View All
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {liveStreams.map((stream) => (
                <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/watch/${stream.id}`)}>
                  <div className="aspect-video bg-gradient-to-br from-red-500/20 to-primary/20 relative">
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-red-500">
                        <Radio className="h-3 w-3 mr-1 animate-pulse" />
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      <Eye className="h-3 w-3 inline mr-1" />
                      {stream.viewer_count}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2">{stream.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started {formatDistanceToNow(new Date(stream.started_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Videos Section */}
      <section className="py-12">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Recent Videos</h2>
            <Button variant="ghost" onClick={() => navigate('/videos')}>
              View All
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading content...</div>
          ) : videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No videos yet. Be the first to upload!</p>
                <Button onClick={() => navigate('/videos')}>Upload Video</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/video/${video.id}`)}>
                  <div className="aspect-video bg-muted relative group">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Play className="h-16 w-16 text-primary" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />{video.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />{video.likes.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              One unified platform for all your video streaming and collaboration needs
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="text-center">
              <CardHeader>
                <Radio className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <CardTitle>Live Streaming</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Broadcast live from your browser. No software needed.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Video className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Video Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Upload and host videos with professional quality transcoding.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Video Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Collaborate with multi-participant video conferences.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <Heart className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Crypto Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Support creators with cryptocurrency tips and donations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <Card className="border-0 shadow-glow bg-gradient-card">
            <CardContent className="py-12 text-center space-y-6">
              <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join CrabbyTV today and start creating, streaming, and earning
              </p>
              <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-hero">
                Sign Up Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
