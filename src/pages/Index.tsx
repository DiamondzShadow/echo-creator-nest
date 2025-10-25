import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Play, Eye, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Asset {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  views: number;
  created_at: string;
  status: string;
  user_id: string;
  duration: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'ready')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(24);

      setVideos(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container px-4 py-6 mt-16">
        {loading ? (
          <div className="text-center py-12">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No videos yet</p>
            <button onClick={() => navigate('/videos')} className="text-primary hover:underline">
              Upload the first video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => navigate(`/video/${video.id}`)}
                className="cursor-pointer group"
              >
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2 relative">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-background">
                      <Play className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {video.duration > 0 && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-medium line-clamp-2 text-sm group-hover:text-primary">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {video.views.toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
