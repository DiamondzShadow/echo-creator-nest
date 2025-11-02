import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const VIDEO_CATEGORIES = [
  "Drama",
  "Comedy",
  "Shorts",
  "Music",
  "Sports",
  "Gaming",
  "News",
  "Entertainment",
  "Education",
  "Science & Technology",
  "Travel",
  "Lifestyle",
  "Other",
] as const;

export const LivepeerUpload = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [enableIPFS, setEnableIPFS] = useState(true);
  const [assetInfo, setAssetInfo] = useState<{ playbackId?: string; ipfs?: { cid?: string; url?: string } } | null>(null);

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

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }
      setThumbnailFile(selectedFile);
      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setThumbnailPreview(previewUrl);
    }
  };

  const uploadThumbnail = async (assetId: string): Promise<string | null> => {
    if (!thumbnailFile) return null;

    try {
      const fileExt = thumbnailFile.name.split('.').pop();
      const fileName = `${assetId}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, thumbnailFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      return null;
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
          description: description || undefined,
          category: category || undefined,
          enableIPFS,
        },
      });

      if (uploadError) throw uploadError;

      const { tusEndpoint, assetId, playbackId } = uploadData;

      // Upload using TUS protocol
      const tus = await import('tus-js-client');
      const Upload = (tus as any).Upload || (tus as any).default?.Upload;
      if (!Upload) {
        throw new Error('Upload library not loaded');
      }

      return new Promise((resolve, reject) => {
        const upload = new Upload(file, {
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
            
            // Upload thumbnail if provided
            const thumbnailUrl = await uploadThumbnail(assetId);
            
            toast({
              title: 'Upload complete',
              description: 'Processing your video...',
            });

            // Poll for processing status
            pollAssetStatus(assetId, playbackId, thumbnailUrl);
            resolve(null);
          },
        });

        upload.start();
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const pollAssetStatus = async (assetId: string, playbackId: string, customThumbnail?: string | null) => {
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
          // Update thumbnail in database if custom thumbnail was uploaded
          if (customThumbnail) {
            await supabase
              .from('assets')
              .update({ thumbnail_url: customThumbnail })
              .eq('livepeer_asset_id', assetId);
          }
          
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
      } catch (error) {
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
        <CardTitle>Upload Video</CardTitle>
        <CardDescription>
          Select a video file to upload
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter video title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploadStatus !== 'idle'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Enter video description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploadStatus !== 'idle'}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category (Optional)</Label>
          <Select value={category} onValueChange={setCategory} disabled={uploadStatus !== 'idle'}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-file">Video File</Label>
          <Input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={uploadStatus !== 'idle'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail-file">Custom Thumbnail (Optional)</Label>
          <Input
            id="thumbnail-file"
            type="file"
            accept="image/*"
            onChange={handleThumbnailSelect}
            disabled={uploadStatus !== 'idle'}
          />
          {thumbnailPreview && (
            <div className="mt-2 relative w-full max-w-xs">
              <img 
                src={thumbnailPreview} 
                alt="Thumbnail preview" 
                className="w-full rounded-lg border"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="ipfs"
            checked={enableIPFS}
            onCheckedChange={setEnableIPFS}
            disabled={uploadStatus !== 'idle'}
          />
          <Label htmlFor="ipfs" className="cursor-pointer text-sm">
            Store permanently (decentralized)
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
          Upload Video
        </Button>

        {uploadStatus === 'ready' && (
          <Button
            onClick={() => {
              setFile(null);
              setThumbnailFile(null);
              setThumbnailPreview('');
              setTitle('');
              setDescription('');
              setCategory('');
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
