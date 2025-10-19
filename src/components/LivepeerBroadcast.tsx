import { EnableVideoIcon, StopIcon } from "@livepeer/react/assets";
import * as Broadcast from "@livepeer/react/broadcast";
import { getIngest } from "@livepeer/react/external";
import { Card } from "@/components/ui/card";
import { Radio, Signal } from "lucide-react";

interface LivepeerBroadcastProps {
  streamKey: string;
  onBroadcastStateChange?: (isLive: boolean) => void;
}

export const LivepeerBroadcast = ({ streamKey, onBroadcastStateChange }: LivepeerBroadcastProps) => {
  return (
    <Card className="border-0 shadow-glow bg-gradient-card overflow-hidden">
      <Broadcast.Root ingestUrl={getIngest(streamKey)}>
        <Broadcast.Container className="h-full w-full bg-gradient-to-br from-background to-muted relative">
          {/* Video preview */}
          <Broadcast.Video 
            title="Your livestream" 
            className="h-full w-full object-cover"
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

          {/* Controls */}
          <Broadcast.Controls className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
            <div className="flex items-center justify-center gap-4">
              {/* Enable/Disable camera */}
              <Broadcast.VideoEnabledTrigger className="w-12 h-12 rounded-full bg-primary/20 hover:bg-primary/30 backdrop-blur flex items-center justify-center transition-all hover:scale-110 duration-200">
                <Broadcast.VideoEnabledIndicator asChild matcher={false}>
                  <EnableVideoIcon className="w-6 h-6 text-primary" />
                </Broadcast.VideoEnabledIndicator>
                <Broadcast.VideoEnabledIndicator asChild>
                  <EnableVideoIcon className="w-6 h-6 text-white" />
                </Broadcast.VideoEnabledIndicator>
              </Broadcast.VideoEnabledTrigger>

              {/* Start/Stop broadcast */}
              <Broadcast.EnabledTrigger className="w-16 h-16 rounded-full bg-gradient-to-br from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 shadow-glow flex items-center justify-center transition-all hover:scale-110 duration-200 relative overflow-hidden">
                <Broadcast.EnabledIndicator asChild matcher={false}>
                  <div className="absolute inset-0 bg-primary opacity-0 hover:opacity-20 transition-opacity" />
                </Broadcast.EnabledIndicator>
                <Broadcast.EnabledIndicator asChild matcher={false}>
                  <EnableVideoIcon className="w-8 h-8 text-white relative z-10" />
                </Broadcast.EnabledIndicator>
                <Broadcast.EnabledIndicator asChild>
                  <StopIcon className="w-8 h-8 text-white relative z-10" />
                </Broadcast.EnabledIndicator>
              </Broadcast.EnabledTrigger>

              {/* Audio toggle */}
              <Broadcast.AudioEnabledTrigger className="w-12 h-12 rounded-full bg-primary/20 hover:bg-primary/30 backdrop-blur flex items-center justify-center transition-all hover:scale-110 duration-200">
                <Broadcast.AudioEnabledIndicator asChild matcher={false}>
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                </Broadcast.AudioEnabledIndicator>
                <Broadcast.AudioEnabledIndicator asChild>
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </Broadcast.AudioEnabledIndicator>
              </Broadcast.AudioEnabledTrigger>
            </div>

            {/* Info text */}
            <Broadcast.StatusIndicator
              matcher="idle"
              className="text-center mt-4"
            >
              <p className="text-xs text-muted-foreground">Click the red button to start broadcasting</p>
            </Broadcast.StatusIndicator>
            <Broadcast.StatusIndicator
              matcher="pending"
              className="text-center mt-4"
            >
              <p className="text-xs text-amber-500">Connecting to server...</p>
            </Broadcast.StatusIndicator>
            <Broadcast.StatusIndicator
              matcher="live"
              className="text-center mt-4"
            >
              <p className="text-xs text-destructive font-medium">🔴 You are live! Click stop to end the broadcast</p>
            </Broadcast.StatusIndicator>
          </Broadcast.Controls>
        </Broadcast.Container>
      </Broadcast.Root>
    </Card>
  );
};
