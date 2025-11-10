import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Check } from 'lucide-react';

interface TikTokUploadProps {
  videoUrl: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

export const TikTokUpload = ({ videoUrl, defaultTitle, defaultDescription }: TikTokUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState(defaultDescription || '');
  const [privacyLevel, setPrivacyLevel] = useState<'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'>('PUBLIC_TO_EVERYONE');
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableComment, setDisableComment] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your TikTok video',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        toast({
          title: 'Please sign in',
          description: 'You need to be signed in to upload to TikTok',
          variant: 'destructive',
        });
        return;
      }

      // Check if TikTok is connected
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('platform', 'tiktok')
        .maybeSingle();

      if (!connection) {
        toast({
          title: 'TikTok Not Connected',
          description: 'Please connect your TikTok account first',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('tiktok-upload', {
        body: {
          videoUrl,
          title: title.trim(),
          description: description.trim(),
          privacy_level: privacyLevel,
          disable_duet: disableDuet,
          disable_comment: disableComment,
          disable_stitch: disableStitch,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      setUploaded(true);
      toast({
        title: 'Upload Started!',
        description: 'Your video is being uploaded to TikTok as a draft. You can edit and publish it in the TikTok app.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload to TikTok',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <Card className="border-green-500 bg-green-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Uploaded to TikTok!</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your video is being processed. Check your TikTok app to edit and publish it.
          </p>
          <Button
            onClick={() => setUploaded(false)}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            Upload Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-glow bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
          Upload to TikTok
        </CardTitle>
        <CardDescription>
          Upload this video to your TikTok account as a draft
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tiktok-title">Title *</Label>
          <Input
            id="tiktok-title"
            placeholder="Give your TikTok a catchy title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
          />
          <p className="text-xs text-muted-foreground">{title.length}/150 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tiktok-description">Description (optional)</Label>
          <Textarea
            id="tiktok-description"
            placeholder="Describe your video..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2200}
          />
          <p className="text-xs text-muted-foreground">{description.length}/2200 characters</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="privacy">Privacy Level</Label>
          <Select value={privacyLevel} onValueChange={(v: any) => setPrivacyLevel(v)}>
            <SelectTrigger id="privacy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC_TO_EVERYONE">Public</SelectItem>
              <SelectItem value="MUTUAL_FOLLOW_FRIENDS">Friends</SelectItem>
              <SelectItem value="SELF_ONLY">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="disable-duet" className="text-sm">
              Disable Duet
            </Label>
            <Switch
              id="disable-duet"
              checked={disableDuet}
              onCheckedChange={setDisableDuet}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="disable-stitch" className="text-sm">
              Disable Stitch
            </Label>
            <Switch
              id="disable-stitch"
              checked={disableStitch}
              onCheckedChange={setDisableStitch}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="disable-comment" className="text-sm">
              Disable Comments
            </Label>
            <Switch
              id="disable-comment"
              checked={disableComment}
              onCheckedChange={setDisableComment}
            />
          </div>
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !title.trim()}
          className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:opacity-90"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading to TikTok...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload to TikTok
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Video will be uploaded as a draft. You can edit and publish it in the TikTok app.
        </p>
      </CardContent>
    </Card>
  );
};
