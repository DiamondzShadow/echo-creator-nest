import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Edit, Upload, Loader2, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoEditDialogProps {
  videoId: string;
  currentTitle: string;
  currentDescription?: string;
  currentThumbnail?: string;
  currentIsPublic: boolean;
  storageProvider?: string | null;
  onUpdate: () => void;
}

export const VideoEditDialog = ({ 
  videoId, 
  currentTitle, 
  currentDescription,
  currentThumbnail,
  currentIsPublic,
  storageProvider,
  onUpdate 
}: VideoEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription || '');
  const [isPublic, setIsPublic] = useState(currentIsPublic);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(currentThumbnail || '');
  const [clearThumbnail, setClearThumbnail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const { toast } = useToast();

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file (JPG, PNG, WEBP)',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Thumbnail must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
      setClearThumbnail(false);
    }
  };

  const handleClearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    setClearThumbnail(true);
  };

  const handleGenerateAI = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a video title before generating a thumbnail',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-thumbnail', {
        body: { 
          title: title.trim(),
          description: description.trim(),
          category: null
        }
      });

      if (error) throw error;

      if (!data?.imageUrl) {
        throw new Error('No image URL in response');
      }

      console.log('✨ AI thumbnail generated successfully');

      // Convert base64 to File
      const response = await fetch(data.imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `ai-thumbnail-${Date.now()}.png`, { type: 'image/png' });
      
      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(blob);
      setThumbnailPreview(previewUrl);
      setClearThumbnail(false);

      toast({
        title: 'AI thumbnail generated',
        description: 'Your custom AI thumbnail is ready. Click "Save Changes" to apply it.',
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'AI generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate thumbnail',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const fileExt = thumbnailFile.name.split('.').pop();
      const fileName = `custom-thumb-${Date.now()}.${fileExt}`;
      
      // Use 'recordings' bucket for Supabase-stored videos, 'avatars' for others
      const bucket = storageProvider === 'supabase' ? 'recordings' : 'avatars';
      const filePath = `${session.user.id}/thumbnails/${fileName}`;

      console.log(`📤 Uploading custom thumbnail to ${bucket}/${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, thumbnailFile, { 
          upsert: true,
          contentType: thumbnailFile.type 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      console.log('✅ Custom thumbnail uploaded:', publicUrl);
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
      // Verify ownership before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You must be logged in to edit videos');
      }

      // Check if this video belongs to the current user
      const { data: videoData, error: fetchError } = await supabase
        .from('assets')
        .select('user_id')
        .eq('id', videoId)
        .single();

      if (fetchError) throw fetchError;

      if (videoData.user_id !== session.user.id) {
        throw new Error('You can only edit your own videos');
      }

      const updates: any = {
        title,
        description,
        is_public: isPublic,
      };

      // Handle thumbnail changes
      if (clearThumbnail) {
        // Clear custom thumbnail to revert to auto-generated
        updates.thumbnail_url = null;
        console.log('🗑️ Clearing custom thumbnail (revert to auto-generated)');
      } else if (thumbnailFile) {
        // Upload new custom thumbnail
        const thumbnailUrl = await uploadThumbnail();
        if (thumbnailUrl) {
          updates.thumbnail_url = thumbnailUrl;
        }
      }

      // Update with explicit ownership check in query
      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', videoId)
        .eq('user_id', session.user.id);

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
            <Label htmlFor="thumbnail" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Custom Thumbnail
            </Label>
            <p className="text-sm text-muted-foreground">
              Thumbnails are auto-generated at 5 seconds. Upload a custom image to replace it (JPG, PNG, WEBP, max 5MB).
            </p>
            
            {currentThumbnail && !thumbnailPreview && !clearThumbnail && (
              <div className="mt-2 relative">
                <p className="text-xs text-muted-foreground mb-1">Current thumbnail:</p>
                <div className="relative inline-block">
                  <img 
                    src={currentThumbnail} 
                    alt="Current thumbnail" 
                    className="w-full max-w-md rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleClearThumbnail}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Remove" to revert to auto-generated thumbnail
                </p>
              </div>
            )}
            
            {clearThumbnail && !thumbnailPreview && (
              <div className="p-4 border border-dashed rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Custom thumbnail will be removed. Auto-generated thumbnail will be used.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setClearThumbnail(false);
                    setThumbnailPreview(currentThumbnail || '');
                  }}
                >
                  Undo
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleThumbnailSelect}
                  className="flex-1"
                />
                {thumbnailFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setThumbnailFile(null);
                      setThumbnailPreview(currentThumbnail || '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGenerateAI}
                disabled={generatingAI || loading || !title.trim()}
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating AI Thumbnail...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
            
            {thumbnailPreview && !clearThumbnail && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">
                  {thumbnailFile ? 'New custom thumbnail:' : 'Current thumbnail:'}
                </p>
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
