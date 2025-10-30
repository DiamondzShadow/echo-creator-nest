import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { BrandBanner } from '@/components/BrandBanner';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoComments } from '@/components/VideoComments';
import { VideoTipButton } from '@/components/VideoTipButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { User } from '@supabase/supabase-js';

interface Asset {
  id: string;
  title: string;
  description: string;
  livepeer_playback_id: string;
  views: number;
  likes: number;
  shares: number;
  created_at: string;
  duration: number;
  tags: string[];
  category: string;
  ipfs_cid: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
    wallet_address: string | null;
  };
}

const VideoWatch = () => {
  const { assetId } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (assetId) {
      fetchAsset();
      checkUser();
      checkIfLiked();
    }
  }, [assetId]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user);
  };

  const fetchAsset = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      if (error) throw error;
      
      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, wallet_address')
        .eq('id', data.user_id)
        .single();
      
      setAsset({
        ...data,
        profiles: profileData || {
          username: 'user',
          display_name: 'Anonymous',
          avatar_url: '',
          wallet_address: null,
        },
      });
    } catch (error) {
      console.error('Error fetching asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data } = await supabase
        .from('video_likes')
        .select('id')
        .eq('asset_id', assetId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to like videos',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('video_likes')
          .delete()
          .eq('asset_id', assetId)
          .eq('user_id', user.id);
        setIsLiked(false);
      } else {
        // Like
        await supabase
          .from('video_likes')
          .insert({
            asset_id: assetId,
            user_id: user.id,
          });
        setIsLiked(true);
      }
      
      // Refresh asset to get updated like count
      fetchAsset();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <BrandBanner />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <BrandBanner />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Video not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BrandBanner />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VideoPlayer
              playbackId={asset.livepeer_playback_id}
              assetId={asset.id}
              title={asset.title}
              views={asset.views}
              likes={asset.likes}
              shares={asset.shares}
              isLiked={isLiked}
              onLike={handleLike}
              onShare={() => fetchAsset()}
            />

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={asset.profiles?.avatar_url} />
                    <AvatarFallback>
                      {asset.profiles?.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{asset.profiles?.display_name}</h3>
                    <p className="text-sm text-muted-foreground">@{asset.profiles?.username}</p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/profile/${asset.user_id}`)}
                      >
                        View Profile
                      </Button>
                      <VideoTipButton
                        videoId={asset.id}
                        creatorUserId={asset.user_id}
                        creatorWalletAddress={asset.profiles?.wallet_address}
                        creatorUsername={asset.profiles?.username || 'Creator'}
                      />
                    </div>
                  </div>
                </div>

                {asset.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm whitespace-pre-wrap">{asset.description}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Published {formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Duration: {formatDuration(asset.duration)}
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {asset.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  {asset.ipfs_cid && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">IPFS</Badge>
                      <a
                        href={`https://ipfs.io/ipfs/${asset.ipfs_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View on IPFS
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <VideoComments assetId={asset.id} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Video Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Views:</span>
                  <span className="font-semibold">{asset.views.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Likes:</span>
                  <span className="font-semibold">{asset.likes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares:</span>
                  <span className="font-semibold">{asset.shares.toLocaleString()}</span>
                </div>
                {asset.category && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Category:</span>
                    <Badge>{asset.category}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoWatch;
