import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { Eye, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Asset {
  id: string;
  title: string;
  livepeer_playback_id: string;
  thumbnail_url: string;
  duration: number;
  views: number;
  likes: number;
}

export const PublicVideos = () => {
  const [videos, setVideos] = useState<Asset[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicVideos();
  }, []);

  const fetchPublicVideos = async () => {
    try {
      const { data } = await supabase
        .from('assets')
        .select('id, title, livepeer_playback_id, thumbnail_url, duration, views, likes')
        .eq('is_public', true)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) setVideos(data);
    } catch (error) {
      console.error('Error fetching public videos:', error);
    }
  };

  if (videos.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Latest Public Videos</h2>
          <p className="text-muted-foreground">Discover content from our creators</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {videos.map((video) => (
            <Card 
              key={video.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/video/${video.id}`)}
            >
              <VideoThumbnail
                title={video.title}
                thumbnailUrl={video.thumbnail_url}
                playbackId={video.livepeer_playback_id}
                duration={video.duration}
              />
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />{video.views.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />{video.likes.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
