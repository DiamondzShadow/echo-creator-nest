import { EnableVideoIcon, StopIcon } from "@livepeer/react/assets";
import * as Broadcast from "@livepeer/react/broadcast";
import { getIngest } from "@livepeer/react/external";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Radio, Signal, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface LivepeerBroadcastProps {
  streamKey: string;
  onBroadcastStateChange?: (isLive: boolean) => void;
}

export const LivepeerBroadcast = ({ streamKey, onBroadcastStateChange }: LivepeerBroadcastProps) => {
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionReady, setPermissionReady] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Compute ingest URL and force a remount when streamKey changes
  const ingestUrl = useMemo(() => {
    if (!streamKey) {
      console.log("⚠️ No stream key provided");
      return undefined;
    }
    try {
      const url = getIngest(streamKey);
      console.log("✅ Ingest URL computed:", url);
      return url;
    } catch (e) {
      console.error("❌ Failed to compute ingest URL:", e);
      return undefined;
    }
  }, [streamKey]);
  const [broadcastKey, setBroadcastKey] = useState<string>("preview");

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ video: true, audio: true });
      stream?.getTracks?.().forEach((t) => t.stop());
      setPermissionReady(true);
      setPermissionError(null);
    } catch (e: any) {
      setPermissionError(e?.message || 'Camera/mic permission denied');
      setPermissionReady(false);
    }
  };

  useEffect(() => {
    // Warm-up permission prompt on mount
    requestPermissions();
  }, []);

  useEffect(() => {
    if (streamKey) {
      // Force a remount so Broadcast.Root fully re-initializes with the new ingestUrl
      setBroadcastKey(`broadcast-${streamKey}-${Date.now()}`);
    }
  }, [streamKey]);

  useEffect(() => {
    if (ingestUrl) {
      // Helpful debug logs when connecting
      // eslint-disable-next-line no-console
      console.log("🔴 Broadcast ingestUrl:", ingestUrl);
    }
  }, [ingestUrl]);

  const handleBroadcastError = (error: { type: string; message: string } | null) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Broadcast error:', error);
      setBroadcastError(error.message || 'Broadcast error');
    } else if (broadcastError) {
      setBroadcastError(null);
    }
  };

  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      {ingestUrl ? (
        <Broadcast.Root
          key={broadcastKey}
          ingestUrl={ingestUrl}
          aspectRatio={16/9}
          timeout={15000}
          hotkeys={true}
          // Constrain camera for stability and bandwidth predictability
          video={{
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          }}
          audio={true}
          onError={handleBroadcastError}
        >
          <Broadcast.Container className="aspect-video bg-gradient-to-br from-background to-muted relative">
            {/* Video preview with mirror effect for selfie cam */}
            <Broadcast.Video 
              title="Your livestream" 
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Status indicator */}
            <Broadcast.LoadingIndicator asChild matcher={false}>
              <div className="absolute top-4 left-4 z-10 overflow-hidden py-1.5 px-3 rounded-full bg-black/60 backdrop-blur flex items-center shadow-glow">
                <Broadcast.StatusIndicator
                  matcher="live"
                  className="flex gap-2 items-center"
                >
                  <div className="bg-destructive animate-pulse h-2 w-2 rounded-full shadow-glow" />
                  <Radio className="w-3 h-3" />
                  <span className="text-xs font-bold select-none">LIVE</span>
                </Broadcast.StatusIndicator>

                <Broadcast.StatusIndicator
                  className="flex gap-2 items-center"
                  matcher="pending"
                >
                  <div className="bg-amber-500 h-2 w-2 rounded-full animate-pulse" />
                  <Signal className="w-3 h-3 animate-pulse" />
                  <span className="text-xs font-medium select-none">CONNECTING</span>
                </Broadcast.StatusIndicator>

                <Broadcast.StatusIndicator
                  className="flex gap-2 items-center"
                  matcher="idle"
                >
                  <div className="bg-muted-foreground h-2 w-2 rounded-full" />
                  <span className="text-xs select-none">READY</span>
                </Broadcast.StatusIndicator>
              </div>
            </Broadcast.LoadingIndicator>

            {/* Permissions */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
              {!permissionReady && (
                <Button variant="secondary" size="sm" onClick={requestPermissions}>
                  Allow Camera & Mic
                </Button>
              )}
              {permissionError && (
                <div className="text-xs text-destructive bg-background/60 backdrop-blur px-3 py-1.5 rounded">
                  {permissionError}
                </div>
              )}
            </div>

            {/* Enhanced Controls */}
            <Broadcast.Controls className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6">
              <div className="flex flex-col gap-4">
                {/* Main control buttons */}
                <div className="flex items-center justify-center gap-4">
                  {/* Video toggle */}
                  <Broadcast.VideoEnabledTrigger className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 duration-200 border border-white/20">
                    <Broadcast.VideoEnabledIndicator asChild matcher={false}>
                      <VideoOff className="w-5 h-5 text-destructive" />
                    </Broadcast.VideoEnabledIndicator>
                    <Broadcast.VideoEnabledIndicator asChild>
                      <Video className="w-5 h-5 text-white" />
                    </Broadcast.VideoEnabledIndicator>
                  </Broadcast.VideoEnabledTrigger>

                  {/* Start/Stop broadcast - Main button */}
                  <Broadcast.EnabledTrigger className="w-16 h-16 rounded-full bg-gradient-to-br from-destructive via-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 shadow-glow flex items-center justify-center transition-all hover:scale-110 duration-200 relative overflow-hidden border-2 border-white/20">
                    <Broadcast.EnabledIndicator asChild matcher={false}>
                      <div className="flex items-center justify-center">
                        <Radio className="w-7 h-7 text-white" />
                      </div>
                    </Broadcast.EnabledIndicator>
                    <Broadcast.EnabledIndicator asChild>
                      <div className="w-6 h-6 bg-white rounded-sm" />
                    </Broadcast.EnabledIndicator>
                  </Broadcast.EnabledTrigger>

                  {/* Audio toggle */}
                  <Broadcast.AudioEnabledTrigger className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 duration-200 border border-white/20">
                    <Broadcast.AudioEnabledIndicator asChild matcher={false}>
                      <MicOff className="w-5 h-5 text-destructive" />
                    </Broadcast.AudioEnabledIndicator>
                    <Broadcast.AudioEnabledIndicator asChild>
                      <Mic className="w-5 h-5 text-white" />
                    </Broadcast.AudioEnabledIndicator>
                  </Broadcast.AudioEnabledTrigger>
                </div>

                {/* Status messages */}
                <div className="text-center">
                  <Broadcast.StatusIndicator matcher="idle">
                    <p className="text-sm text-muted-foreground">Click the red button to go live</p>
                  </Broadcast.StatusIndicator>
                  
                  <Broadcast.StatusIndicator matcher="pending">
                    <div className="flex items-center justify-center gap-2">
                      <Signal className="w-4 h-4 text-amber-500 animate-pulse" />
                      <p className="text-sm text-amber-500">Connecting to stream...</p>
                    </div>
                  </Broadcast.StatusIndicator>
                  
                  <Broadcast.StatusIndicator matcher="live">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      <p className="text-sm text-destructive font-bold">LIVE - Broadcasting to viewers</p>
                    </div>
                  </Broadcast.StatusIndicator>
                </div>

                {/* Inline error message */}
                {broadcastError && (
                  <div className="text-center">
                    <div className="inline-block rounded bg-destructive/10 border border-destructive/30 px-3 py-2">
                      <p className="text-sm text-destructive">{broadcastError}</p>
                    </div>
                  </div>
                )}
              </div>
            </Broadcast.Controls>
          </Broadcast.Container>
        </Broadcast.Root>
      ) : (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Waiting for stream key... Create a stream to enable browser broadcasting.</p>
        </div>
      )}
    </Card>
  );
};
