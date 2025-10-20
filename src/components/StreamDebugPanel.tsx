import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, AlertCircle, CheckCircle, Info, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StreamDebugInfo {
  streamKey?: string;
  playbackId?: string;
  ingestUrl?: string;
  isLive?: boolean;
  sources?: any[];
  errors?: string[];
  warnings?: string[];
  browserInfo?: {
    userAgent: string;
    webRTC: boolean;
    mediaDevices: boolean;
  };
}

interface StreamDebugPanelProps {
  streamKey?: string;
  playbackId?: string;
  isLive?: boolean;
  className?: string;
}

export const StreamDebugPanel = ({ streamKey, playbackId, isLive, className }: StreamDebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<StreamDebugInfo>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const checkBrowserCapabilities = () => {
    return {
      userAgent: navigator.userAgent,
      webRTC: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection),
      mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
  };

  const analyzeStreamIssues = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check browser support
    const browser = checkBrowserCapabilities();
    if (!browser.webRTC) {
      errors.push('WebRTC is not supported in this browser. Live streaming will not work properly.');
    }
    if (!browser.mediaDevices) {
      errors.push('Media devices API not available. Camera access will fail.');
    }

    // Check for Safari specific issues
    if (/Safari/.test(browser.userAgent) && !/Chrome/.test(browser.userAgent)) {
      warnings.push('Safari detected. You might experience WebRTC compatibility issues. Chrome or Firefox recommended.');
    }

    // Check for mobile browsers
    if (/Mobile|Android|iPhone|iPad/i.test(browser.userAgent)) {
      warnings.push('Mobile browser detected. Some features might be limited.');
    }

    // Check stream configuration
    if (streamKey && !isLive) {
      warnings.push('Stream key is set but stream is not live. Click "Go Live" to start broadcasting.');
    }

    if (!streamKey && isLive) {
      errors.push('Stream marked as live but no stream key available. This is likely a bug.');
    }

    // Check for common network issues
    if (typeof window !== 'undefined' && !(window as any).RTCPeerConnection) {
      errors.push('RTCPeerConnection not available. This might be blocked by browser extensions or corporate firewall.');
    }

    return { errors, warnings };
  };

  const refreshDebugInfo = () => {
    setIsRefreshing(true);
    const issues = analyzeStreamIssues();
    const browser = checkBrowserCapabilities();
    
    setDebugInfo({
      streamKey,
      playbackId,
      isLive,
      browserInfo: browser,
      errors: issues.errors,
      warnings: issues.warnings,
    });

    // Simulate checking stream health
    setTimeout(() => {
      setIsRefreshing(false);
      console.log('🔍 Debug info refreshed:', {
        streamKey: streamKey?.substring(0, 20) + '...',
        playbackId,
        isLive,
        browser,
        issues
      });
    }, 1000);
  };

  useEffect(() => {
    if (isOpen) {
      refreshDebugInfo();
    }
  }, [isOpen, streamKey, playbackId, isLive]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
      duration: 2000,
    });
  };

  const getStreamIngestUrl = (key: string) => {
    // Livepeer RTMP ingest URL format
    return `rtmp://rtmp.livepeer.com/live/${key}`;
  };

  const getStreamStatus = () => {
    if (!streamKey && !playbackId) return { status: 'Not configured', color: 'text-muted-foreground', icon: Info };
    if (debugInfo.errors?.length) return { status: 'Errors detected', color: 'text-destructive', icon: AlertCircle };
    if (debugInfo.warnings?.length) return { status: 'Warnings', color: 'text-yellow-500', icon: AlertCircle };
    if (isLive) return { status: 'Live', color: 'text-green-500', icon: CheckCircle };
    return { status: 'Ready', color: 'text-blue-500', icon: Info };
  };

  const status = getStreamStatus();
  const StatusIcon = status.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className="text-sm font-medium">Stream Debug Panel</span>
            <span className={`text-xs ${status.color}`}>({status.status})</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card className="p-4 mt-2 space-y-4 bg-background/50">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={refreshDebugInfo}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Errors */}
          {debugInfo.errors?.length ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-destructive">Errors</h4>
              {debugInfo.errors.map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Warnings */}
          {debugInfo.warnings?.length ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-yellow-500">Warnings</h4>
              {debugInfo.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Stream Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Stream Information</h4>
            
            {streamKey && (
              <div className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                <span className="text-muted-foreground">Stream Key:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono">
                    {streamKey.substring(0, 20)}...
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(streamKey, 'Stream key')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {playbackId && (
              <div className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                <span className="text-muted-foreground">Playback ID:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono">{playbackId}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(playbackId, 'Playback ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {streamKey && (
              <div className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                <span className="text-muted-foreground">RTMP URL:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[10px]">
                    {getStreamIngestUrl(streamKey).substring(0, 40)}...
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(getStreamIngestUrl(streamKey), 'RTMP URL')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs bg-muted p-2 rounded">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${status.color}`}>{isLive ? 'Broadcasting' : 'Not Broadcasting'}</span>
            </div>
          </div>

          {/* Browser Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Browser Capabilities</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">WebRTC Support:</span>
                <span className={debugInfo.browserInfo?.webRTC ? 'text-green-500' : 'text-destructive'}>
                  {debugInfo.browserInfo?.webRTC ? 'Supported ✓' : 'Not Supported ✗'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Media Devices:</span>
                <span className={debugInfo.browserInfo?.mediaDevices ? 'text-green-500' : 'text-destructive'}>
                  {debugInfo.browserInfo?.mediaDevices ? 'Available ✓' : 'Not Available ✗'}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Browser:</span>
                <div className="font-mono text-[10px] mt-1 p-2 bg-muted rounded break-all">
                  {debugInfo.browserInfo?.userAgent}
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Troubleshooting Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use Chrome or Firefox for best WebRTC support</li>
              <li>• Ensure camera permissions are granted</li>
              <li>• Check that no other app is using the camera</li>
              <li>• For OBS: Use H.264 Baseline profile, disable B-frames</li>
              <li>• Set keyframe interval to 2 seconds for low latency</li>
              <li>• If WebRTC fails, HLS fallback will activate (5-10s delay)</li>
            </ul>
          </div>

          {/* Console Command */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Debug Commands</h4>
            <div className="text-xs bg-muted p-2 rounded font-mono">
              <div>// Check WebRTC support</div>
              <div>console.log(!!window.RTCPeerConnection);</div>
              <div className="mt-2">// Check media devices</div>
              <div>navigator.mediaDevices.enumerateDevices().then(console.log);</div>
            </div>
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};