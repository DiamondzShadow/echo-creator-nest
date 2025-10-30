import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { getSimpleThumbnailUrl } from '@/lib/livepeer-thumbnails';

interface VideoThumbnailProps {
  title: string;
  thumbnailUrl?: string | null;
  playbackId?: string | null;
  duration?: number | null;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const VideoThumbnail = ({ title, thumbnailUrl, playbackId, duration }: VideoThumbnailProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fallbackStep, setFallbackStep] = useState<0 | 1 | 2>(0);

  const simpleUrl = useMemo(() => (playbackId ? getSimpleThumbnailUrl(playbackId) : null), [playbackId]);
  const imageCacheUrl = useMemo(
    () => (playbackId ? `https://image-cache.livepeer.studio/thumbnail?playbackId=${playbackId}` : null),
    [playbackId]
  );

  useEffect(() => {
    // Reset state when inputs change
    setLoaded(false);
    setFailed(false);
    setFallbackStep(0);

    if (thumbnailUrl) {
      setImgSrc(thumbnailUrl);
    } else if (simpleUrl) {
      setImgSrc(simpleUrl);
      setFallbackStep(1);
    } else if (imageCacheUrl) {
      setImgSrc(imageCacheUrl);
      setFallbackStep(2);
    } else {
      setImgSrc(null);
      setFailed(true);
    }
  }, [thumbnailUrl, simpleUrl, imageCacheUrl]);

  const handleError: React.ReactEventHandler<HTMLImageElement> = () => {
    // Progress through fallbacks exactly once to avoid loops/flashing
    if (fallbackStep === 0 && simpleUrl && imgSrc !== simpleUrl) {
      setImgSrc(simpleUrl);
      setFallbackStep(1);
      setLoaded(false);
    } else if (fallbackStep <= 1 && imageCacheUrl && imgSrc !== imageCacheUrl) {
      setImgSrc(imageCacheUrl);
      setFallbackStep(2);
      setLoaded(false);
    } else {
      setFailed(true);
    }
  };

  const time = formatDuration(typeof duration === 'number' ? duration : null);

  return (
    <div className="aspect-video bg-muted relative group overflow-hidden">
      {!failed && imgSrc && (
        <img
          src={imgSrc}
          alt={`${title} thumbnail`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
      )}

      {(!imgSrc || failed) && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
          <Play className="h-16 w-16 text-primary" />
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
        <Button variant="secondary" size="lg" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="h-5 w-5 mr-2" />Watch
        </Button>
      </div>

      {time && (
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {time}
        </div>
      )}
    </div>
  );
};