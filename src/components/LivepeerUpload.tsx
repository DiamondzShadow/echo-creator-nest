import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const LivepeerUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [enableIPFS, setEnableIPFS] = useState(true);
  const [assetInfo, setAssetInfo] = useState<{ playbackId?: string; ipfs?: any } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const uploadToLivepeer = async () => {
    if (!file) return;

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);

      // Create upload URL
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('livepeer-asset', {
        body: {
          action: 'create-upload',
          name: title || file.name,
          enableIPFS,
        },
      });

      if (uploadError) throw uploadError;

      const { tusEndpoint, assetId, playbackId } = uploadData;

      // Upload using TUS protocol
      const { default: tus } = await import('tus-js-client');

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          metadata: {
            filename: file.name,
            filetype: file.type,
          },
          uploadSize: file.size,
          onError: (error: Error) => {
            console.error('Upload error:', error);
            setUploadStatus('error');
            toast({
              title: 'Upload failed',
              description: error.message,
              variant: 'destructive',
            });
            reject(error);
          },
          onProgress: (bytesUploaded: number, bytesTotal: number) => {
            const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
            setUploadProgress(Number(percentage));
          },
          onSuccess: async () => {
            console.log('Upload completed!');
            setUploadStatus('processing');
            toast({
              title: 'Upload complete',
              description: 'Processing your video...',
            });

            // Poll for processing status
            pollAssetStatus(assetId, playbackId);
            resolve(null);
          },
        });

        upload.start();
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const pollAssetStatus = async (assetId: string, playbackId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('livepeer-asset', {
          body: {
            action: 'get-status',
            assetId,
          },
        });

        if (error) throw error;

        console.log('Asset status:', data.status, 'Progress:', data.progress);

        if (data.status === 'ready') {
          setUploadStatus('ready');
          setAssetInfo({
            playbackId: data.playbackId || playbackId,
            ipfs: data.ipfs,
          });
          toast({
            title: 'Video ready!',
            description: enableIPFS && data.ipfs?.cid 
              ? `Video is ready and stored on IPFS: ${data.ipfs.cid}`
              : 'Your video is ready to stream',
          });
        } else if (data.status === 'failed') {
          setUploadStatus('error');
          toast({
            title: 'Processing failed',
            description: 'Video processing failed. Please try again.',
            variant: 'destructive',
          });
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000); // Check every 5 seconds
          } else {
            setUploadStatus('error');
            toast({
              title: 'Processing timeout',
              description: 'Video processing is taking longer than expected.',
              variant: 'destructive',
            });
          }
        }
      } catch (error: any) {
        console.error('Status check error:', error);
      }
    };

    checkStatus();
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'ready':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-destructive" />;
      default:
        return <Upload className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Video to Livepeer</CardTitle>
        <CardDescription>
          Professional video hosting with optional IPFS decentralized storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Video Title</Label>
          <Input
            id="title"
            placeholder="Enter video title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploadStatus !== 'idle'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-file">Select Video File</Label>
          <Input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={uploadStatus !== 'idle'}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="ipfs"
            checked={enableIPFS}
            onCheckedChange={setEnableIPFS}
            disabled={uploadStatus !== 'idle'}
          />
          <Label htmlFor="ipfs" className="cursor-pointer">
            Store on IPFS (Decentralized Storage)
          </Label>
        </div>

        {file && uploadStatus === 'idle' && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        )}

        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div className="space-y-2">
            <div className="flex items-center justify-center py-4">
              {getStatusIcon()}
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {uploadStatus === 'uploading' 
                ? `Uploading: ${uploadProgress}%`
                : 'Processing video... This may take a few minutes'}
            </p>
          </div>
        )}

        {uploadStatus === 'ready' && assetInfo && (
          <div className="space-y-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center justify-center">
              {getStatusIcon()}
            </div>
            <p className="text-sm font-medium text-center">Video uploaded successfully!</p>
            <div className="space-y-1 text-xs">
              <p className="font-mono break-all">
                <strong>Playback ID:</strong> {assetInfo.playbackId}
              </p>
              {assetInfo.ipfs?.cid && (
                <div className="space-y-1">
                  <p className="font-mono break-all">
                    <strong>IPFS CID:</strong> {assetInfo.ipfs.cid}
                  </p>
                  <a
                    href={`https://ipfs.io/ipfs/${assetInfo.ipfs.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3" />
                    View on IPFS Gateway
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center justify-center py-4">
            {getStatusIcon()}
          </div>
        )}

        <Button
          onClick={uploadToLivepeer}
          disabled={!file || uploadStatus !== 'idle'}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload to Livepeer
        </Button>

        {uploadStatus === 'ready' && (
          <Button
            onClick={() => {
              setFile(null);
              setTitle('');
              setUploadProgress(0);
              setUploadStatus('idle');
              setAssetInfo(null);
            }}
            variant="outline"
            className="w-full"
          >
            Upload Another Video
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
