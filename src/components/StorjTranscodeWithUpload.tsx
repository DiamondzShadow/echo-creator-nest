import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Video, CheckCircle, AlertCircle, Loader2, FileVideo } from 'lucide-react';

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

export const StorjTranscodeWithUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState('');
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [task, setTask] = useState<TranscodeTask | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultProfiles: TranscodeProfile[] = [
    { name: '1080p', bitrate: 6000000, fps: 30, width: 1920, height: 1080 },
    { name: '720p', bitrate: 3000000, fps: 30, width: 1280, height: 720 },
    { name: '480p', bitrate: 1000000, fps: 30, width: 854, height: 480 },
    { name: '360p', bitrate: 500000, fps: 30, width: 640, height: 360 },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid video file (MP4, WebM, MOV, or AVI)');
        return;
      }

      // Check file size (max 2GB for example)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        toast.error('File size must be less than 2GB');
        return;
      }

      setSelectedFile(file);
      setUploadProgress(0);
      setUploadedPath('');
      toast.success(`Selected: ${file.name}`);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get upload URL from edge function
      const { data: uploadConfig, error: configError } = await supabase.functions.invoke('storj-upload', {
        body: {
          action: 'generate-upload-url',
          filename: selectedFile.name,
          contentType: selectedFile.type,
        },
      });

      if (configError) throw configError;

      // Upload file with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = (e.loaded / e.total) * 100;
          setUploadProgress(percentage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadedPath(uploadConfig.path);
          toast.success('File uploaded successfully!');
          setIsUploading(false);
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload');
      });

      xhr.open('PUT', uploadConfig.uploadUrl);
      xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
      
      // Note: In production, use pre-signed URLs with proper authentication
      xhr.send(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
      setIsUploading(false);
    }
  };

  const startTranscode = async () => {
    if (!uploadedPath) {
      toast.error('Please upload a file first');
      return;
    }

    setIsTranscoding(true);

    try {
      const timestamp = Date.now();
      const { data, error } = await supabase.functions.invoke('livepeer-transcode', {
        body: {
          action: 'create',
          inputPath: uploadedPath,
          outputHlsPath: `/transcoded/${timestamp}/hls`,
          outputMp4Path: `/transcoded/${timestamp}/mp4`,
          profiles: defaultProfiles,
        },
      });

      if (error) throw error;

      setTask(data);
      toast.success('Transcode task created successfully!');

      // Start polling for status
      const interval = window.setInterval(() => {
        checkStatus(data.taskId);
      }, 5000);

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileVideo className="h-6 w-6" />
            Upload & Transcode Video with Storj
          </CardTitle>
          <CardDescription>
            Upload your video to Storj and transcode it using Livepeer's API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">1. Upload</TabsTrigger>
              <TabsTrigger value="transcode" disabled={!uploadedPath}>
                2. Transcode
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Select Video File</Label>
                  <div className="flex gap-2">
                    <Input
                      id="file"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      ref={fileInputRef}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={isUploading}
                    >
                      Browse
                    </Button>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {uploadedPath && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">Upload Complete!</div>
                      <div className="text-sm mt-1">Path: {uploadedPath}</div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={uploadFile}
                  disabled={!selectedFile || isUploading || !!uploadedPath}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload to Storj
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="transcode" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Source File</Label>
                  <div className="p-2 border rounded-md text-sm bg-muted">
                    {uploadedPath}
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
                  disabled={isTranscoding || !uploadedPath}
                  className="w-full"
                >
                  {isTranscoding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transcoding...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Start Transcode
                    </>
                  )}
                </Button>

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
                        </AlertDescription>
                      </Alert>
                    )}

                    {task.status.phase === 'failed' && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Error:</strong> {task.status.errorMessage || 'Unknown error'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
