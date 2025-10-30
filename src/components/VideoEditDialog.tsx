import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Edit, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoEditDialogProps {
  videoId: string;
  currentTitle: string;
  currentDescription?: string;
  currentThumbnail?: string;
  currentIsPublic: boolean;
  onUpdate: () => void;
}

export const VideoEditDialog = ({ 
  videoId, 
  currentTitle, 
  currentDescription,
  currentThumbnail,
  currentIsPublic,
  onUpdate 
}: VideoEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription || '');
  const [isPublic, setIsPublic] = useState(currentIsPublic);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(currentThumbnail || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }
      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return null;

    try {
      const fileExt = thumbnailFile.name.split('.').pop();
      const fileName = `${videoId}.${fileExt}`;
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
      toast({
        title: 'Thumbnail upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload thumbnail',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates: any = {
        title,
        description,
        is_public: isPublic,
      };

      // Upload thumbnail if a new one was selected
      if (thumbnailFile) {
        const thumbnailUrl = await uploadThumbnail();
        if (thumbnailUrl) {
          updates.thumbnail_url = thumbnailUrl;
        }
      }

      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: 'Video updated',
        description: 'Your video has been updated successfully',
      });

      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update video',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>Update your video details and thumbnail</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Video title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Video description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Custom Thumbnail (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              A thumbnail is auto-generated from your video. Upload a custom one only if you want to override it.
            </p>
            {currentThumbnail && !thumbnailPreview && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Current thumbnail:</p>
                <img 
                  src={currentThumbnail} 
                  alt="Current thumbnail" 
                  className="w-full max-w-md rounded-lg border"
                />
              </div>
            )}
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
            />
            {thumbnailPreview && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">New thumbnail:</p>
                <img 
                  src={thumbnailPreview} 
                  alt="Thumbnail preview" 
                  className="w-full max-w-md rounded-lg border"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public">Public (visible on landing page)</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
