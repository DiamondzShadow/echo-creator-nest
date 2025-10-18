import { useEffect, useRef, useState } from 'react';

// Minimal wrapper for the official SoundCloud widget (no OAuth required for public URLs)
// Controls: play, pause, volume (0-100)
// Usage: <SoundCloudWidget url="https://soundcloud.com/artist/track-or-playlist" />

declare global {
  interface Window {
    SC?: any;
  }
}

interface SoundCloudWidgetProps {
  url: string; // Track or playlist permalink URL
  autoPlay?: boolean;
  visual?: boolean; // Use the large visual player
  height?: number | string; // iframe height
}

export function SoundCloudWidget({ url, autoPlay = false, visual = false, height = visual ? 380 : 166 }: SoundCloudWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [widget, setWidget] = useState<any>(null);
  const [volume, setVolume] = useState<number>(50);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Inject widget API script once
  useEffect(() => {
    if (window.SC && window.SC.Widget) return;
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // keep script for subsequent mounts; do not remove
    };
  }, []);

  // Initialize widget when iframe and API are available
  useEffect(() => {
    const interval = setInterval(() => {
      if (!iframeRef.current) return;
      if (window.SC && window.SC.Widget) {
        const w = window.SC.Widget(iframeRef.current);
        setWidget(w);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!widget) return;
    widget.bind('ready', () => {
      setIsReady(true);
      widget.setVolume(volume);
      if (autoPlay) {
        widget.play();
      }
    });
    return () => {
      try {
        widget.unbind('ready');
      } catch {}
    };
  }, [widget]);

  const handlePlay = () => {
    if (!isReady || !widget) return;
    widget.play();
  };

  const handlePause = () => {
    if (!isReady || !widget) return;
    widget.pause();
  };

  const handleVolume = (v: number) => {
    setVolume(v);
    if (isReady && widget) {
      widget.setVolume(v);
    }
  };

  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=${autoPlay}&show_comments=false&visual=${visual}`;

  return (
    <div className="w-full space-y-3">
      <iframe
        ref={iframeRef}
        id="sc-player"
        width="100%"
        height={height}
        scrolling="no"
        frameBorder={0}
        allow="autoplay"
        src={src}
        className="rounded-lg"
      />
      <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
        <button 
          onClick={handlePlay} 
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
        >
          Play
        </button>
        <button 
          onClick={handlePause} 
          className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
        >
          Pause
        </button>
        <div className="flex items-center gap-2 ml-auto flex-1 max-w-xs">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">Volume</label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolume(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-sm font-medium text-muted-foreground min-w-[3ch]">{volume}</span>
        </div>
      </div>
    </div>
  );
}

export default SoundCloudWidget;
