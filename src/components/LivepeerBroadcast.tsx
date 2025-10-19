import { EnableVideoIcon, StopIcon } from "@livepeer/react/assets";
import * as Broadcast from "@livepeer/react/broadcast";
import { getIngest } from "@livepeer/react/external";
import { Card } from "@/components/ui/card";
import { Radio, Signal, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface LivepeerBroadcastProps {
  streamKey: string;
  onBroadcastStateChange?: (isLive: boolean) => void;
}

export const LivepeerBroadcast = ({ streamKey, onBroadcastStateChange }: LivepeerBroadcastProps) => {
  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <Broadcast.Root ingestUrl={getIngest(streamKey)}>
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
            </div>
          </Broadcast.Controls>
        </Broadcast.Container>
      </Broadcast.Root>
    </Card>
  );
};
