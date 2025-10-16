import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Video, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TranscodeProfile {
  name: string;
  bitrate: number;
  fps: number;
  width: number;
  height: number;
}

interface TranscodeTask {
  taskId: string;
  status: {
    phase: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    errorMessage?: string;
  };
  output?: {
    hls?: { path: string };
    mp4?: { path: string };
  };
}

export const StorjTranscode = () => {
  const [inputPath, setInputPath] = useState('');
  const [outputHlsPath, setOutputHlsPath] = useState('');
  const [outputMp4Path, setOutputMp4Path] = useState('');
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [task, setTask] = useState<TranscodeTask | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  const defaultProfiles: TranscodeProfile[] = [
    { name: '1080p', bitrate: 6000000, fps: 30, width: 1920, height: 1080 },
    { name: '720p', bitrate: 3000000, fps: 30, width: 1280, height: 720 },
    { name: '480p', bitrate: 1000000, fps: 30, width: 854, height: 480 },
    { name: '360p', bitrate: 500000, fps: 30, width: 640, height: 360 },
  ];

  const startTranscode = async () => {
    if (!inputPath) {
      toast.error('Please enter an input path');
      return;
    }

    setIsTranscoding(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
        body: {
          action: 'create',
          inputPath,
          outputHlsPath: outputHlsPath || undefined,
          outputMp4Path: outputMp4Path || undefined,
          profiles: defaultProfiles,
        },
      });

      if (error) throw error;

      setTask(data);
      toast.success('Transcode task created successfully!');

      // Start polling for status
      const interval = window.setInterval(() => {
        checkStatus(data.taskId);
      }, 5000); // Poll every 5 seconds

      setPollInterval(interval);
    } catch (error) {
      console.error('Error starting transcode:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start transcode');
      setIsTranscoding(false);
    }
  };

  const checkStatus = async (taskId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
        body: {
          action: 'status',
          taskId,
        },
      });

      if (error) throw error;

      setTask(data);

      // Stop polling if completed or failed
      if (data.status.phase === 'completed' || data.status.phase === 'failed') {
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        setIsTranscoding(false);

        if (data.status.phase === 'completed') {
          toast.success('Transcode completed successfully!');
        } else {
          toast.error(`Transcode failed: ${data.status.errorMessage || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const getStatusIcon = () => {
    if (!task) return <Video className="h-5 w-5" />;

    switch (task.status.phase) {
      case 'pending':
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Video className="h-5 w-5" />;
    }
  };

  const getPlaybackUrl = () => {
    if (!task?.output?.hls?.path) return null;

    const storjShareUrl = 'https://link.storjshare.io';
    const bucketPath = process.env.STORJ_BUCKET_SHARE_PATH || 'YOUR_BUCKET_SHARE_PATH';
    
    return `${storjShareUrl}/${bucketPath}${task.output.hls.path}/index.m3u8`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Transcode Video with Storj
          </CardTitle>
          <CardDescription>
            Transcode videos stored in Storj using Livepeer's powerful transcoding API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inputPath">Input Video Path (in Storj bucket)</Label>
              <Input
                id="inputPath"
                placeholder="/video/source.mp4"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                disabled={isTranscoding}
              />
              <p className="text-sm text-muted-foreground">
                The path to your video file in the Storj bucket
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outputHlsPath">HLS Output Path (optional)</Label>
                <Input
                  id="outputHlsPath"
                  placeholder="/transcoded/hls"
                  value={outputHlsPath}
                  onChange={(e) => setOutputHlsPath(e.target.value)}
                  disabled={isTranscoding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputMp4Path">MP4 Output Path (optional)</Label>
                <Input
                  id="outputMp4Path"
                  placeholder="/transcoded/mp4"
                  value={outputMp4Path}
                  onChange={(e) => setOutputMp4Path(e.target.value)}
                  disabled={isTranscoding}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Transcode Profiles</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {defaultProfiles.map((profile) => (
                  <div key={profile.name} className="p-2 border rounded-md text-sm">
                    <div className="font-medium">{profile.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {profile.width}x{profile.height} @ {profile.fps}fps
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={startTranscode} 
              disabled={isTranscoding || !inputPath}
              className="w-full"
            >
              {isTranscoding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transcoding...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Transcode
                </>
              )}
            </Button>
          </div>

          {task && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-medium capitalize">{task.status.phase}</span>
              </div>

              {task.status.progress !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(task.status.progress * 100)}%</span>
                  </div>
                  <Progress value={task.status.progress * 100} />
                </div>
              )}

              {task.status.phase === 'completed' && task.output && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div className="font-medium">Transcode Complete!</div>
                    {task.output.hls && (
                      <div className="text-sm">
                        <strong>HLS Path:</strong> {task.output.hls.path}
                      </div>
                    )}
                    {task.output.mp4 && (
                      <div className="text-sm">
                        <strong>MP4 Path:</strong> {task.output.mp4.path}
                      </div>
                    )}
                    {getPlaybackUrl() && (
                      <div className="mt-2">
                        <a 
                          href={`https://lvpr.tv/?url=${encodeURIComponent(getPlaybackUrl()!)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Play video →
                        </a>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {task.status.phase === 'failed' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {task.status.errorMessage || 'Unknown error occurred'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <strong>1. Upload Video to Storj</strong>
            <p>First, upload your video file to your Storj bucket using the Storj web interface, uplink CLI, or S3 API client.</p>
          </div>
          <div>
            <strong>2. Configure Paths</strong>
            <p>Enter the input path where your video is stored and optionally specify output paths for HLS and MP4 formats.</p>
          </div>
          <div>
            <strong>3. Start Transcoding</strong>
            <p>Click "Start Transcode" to begin the transcoding process. The video will be transcoded into multiple quality levels.</p>
          </div>
          <div>
            <strong>4. Playback</strong>
            <p>Once complete, your transcoded videos will be available in Storj and can be played back using any HLS player.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
