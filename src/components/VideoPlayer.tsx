import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Eye, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerProps {
  playbackId: string;
  assetId: string;
  title: string;
  views: number;
  likes: number;
  shares?: number;
  onLike?: () => void;
  onShare?: () => void;
  isLiked?: boolean;
}

export const VideoPlayer = ({
  playbackId,
  assetId,
  title,
  views,
  likes,
  shares = 0,
  onLike,
  onShare,
  isLiked = false,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Record view after 3 seconds of watching
    const viewTimer = setTimeout(async () => {
      if (!hasRecordedView) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          await supabase.from('video_views').insert({
            asset_id: assetId,
            user_id: session?.user?.id || null,
            device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          });
          
          setHasRecordedView(true);
        } catch (error) {
          console.error('Error recording view:', error);
        }
      }
    }, 3000);

    return () => clearTimeout(viewTimer);
  }, [assetId, hasRecordedView]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/watch/${assetId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: shareUrl,
        });
        
        // Increment share count
        await supabase
          .from('assets')
          .update({ shares: (shares || 0) + 1 })
          .eq('id', assetId);
          
        if (onShare) onShare();
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied!',
        description: 'Video link copied to clipboard',
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        <iframe
          ref={videoRef}
          src={`https://lvpr.tv?v=${playbackId}&autoplay=false`}
          className="w-full h-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoading(false)}
        />
      </div>
      
      <div className="p-4 space-y-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {views.toLocaleString()} views
            </span>
            <span className="flex items-center gap-1">
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {likes.toLocaleString()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onLike}
              className={isLiked ? 'text-red-500 border-red-500' : ''}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
