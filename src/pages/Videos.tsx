import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { BrandBanner } from '@/components/BrandBanner';
import { LivepeerUpload } from '@/components/LivepeerUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Clock, CheckCircle, AlertCircle, ExternalLink, Eye, Heart, Search, Filter, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Asset {
  id: string;
  title: string;
  description: string;
  livepeer_playback_id: string;
  livepeer_asset_id: string;
  status: string;
  duration: number;
  created_at: string;
  ready_at: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  shares: number;
  is_public: boolean;
  tags: string[];
  category: string;
  ipfs_cid: string;
}

const Videos = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'views' | 'likes'>('recent');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchAssets();
    fixMissingThumbnails();
  }, []);

  const fixMissingThumbnails = async () => {
    try {
      await supabase.functions.invoke('fix-thumbnails');
    } catch (error) {
      console.error('Error fixing thumbnails:', error);
    }
  };

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
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: 'Error loading videos',
        description: error instanceof Error ? error.message : 'An error occurred',
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
            <h1 className="text-4xl font-bold mb-2">My Videos</h1>
            <p className="text-muted-foreground">
              Manage your uploaded videos
            </p>
          </div>

          <Tabs defaultValue="library" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="library">My Videos ({assets.length})</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <LivepeerUpload />
            </TabsContent>

            <TabsContent value="library" className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search videos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={sortBy} onValueChange={(v: 'recent' | 'views' | 'likes') => setSortBy(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="views">Most Viewed</SelectItem>
                    <SelectItem value="likes">Most Liked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assets
                    .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => {
                      if (sortBy === 'views') return b.views - a.views;
                      if (sortBy === 'likes') return b.likes - a.likes;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((asset) => (
                    <Card key={asset.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => navigate(`/video/${asset.id}`)}>
                      <div className="aspect-video bg-muted relative group">
                        {asset.thumbnail_url ? (
                          <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Play className="h-16 w-16 text-primary" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <Button variant="secondary" size="lg" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-5 w-5 mr-2" />Watch
                          </Button>
                        </div>
                        {asset.duration > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(asset.duration)}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold line-clamp-2 flex-1">{asset.title}</h3>
                          {getStatusBadge(asset.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />{asset.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />{asset.likes.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                        </p>
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
