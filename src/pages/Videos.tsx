import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { BrandBanner } from '@/components/BrandBanner';
import { LivepeerUpload } from '@/components/LivepeerUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Asset {
  id: string;
  title: string;
  livepeer_playback_id: string;
  livepeer_asset_id: string;
  status: string;
  duration: number;
  created_at: string;
  ready_at: string;
  thumbnail_url: string;
}

const Videos = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchAssets();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchAssets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssets(data || []);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      toast({
        title: 'Error loading videos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'waiting':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Waiting</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Video Library</h1>
            <p className="text-muted-foreground">
              Upload and manage your videos with Livepeer's professional streaming infrastructure
            </p>
          </div>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="library">My Videos ({assets.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div className="grid gap-6">
                <LivepeerUpload />

                <Card>
                  <CardHeader>
                    <CardTitle>Features</CardTitle>
                    <CardDescription>What you get with Livepeer video hosting</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Professional Quality
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Automatic transcoding to multiple resolutions (360p to 1080p)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        IPFS Storage
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Optional decentralized storage for permanent hosting
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Fast Delivery
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Global CDN for fast playback worldwide
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Adaptive Streaming
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        HLS streaming that adapts to viewer's bandwidth
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="library">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Loading videos...</p>
                  </CardContent>
                </Card>
              ) : assets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No videos uploaded yet</p>
                    <Button onClick={() => navigate('/videos')}>
                      Upload Your First Video
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assets.map((asset) => (
                    <Card key={asset.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative group">
                        {asset.thumbnail_url ? (
                          <img
                            src={asset.thumbnail_url}
                            alt={asset.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {asset.status === 'ready' && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="lg">
                              <Play className="h-5 w-5 mr-2" />
                              Watch
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold line-clamp-2 flex-1">{asset.title}</h3>
                          {getStatusBadge(asset.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{formatDuration(asset.duration)}</span>
                          <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                        </div>
                        {asset.livepeer_playback_id && asset.status === 'ready' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(`https://lvpr.tv?v=${asset.livepeer_playback_id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in Livepeer Player
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Videos;
