import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, Upload, Loader2 } from 'lucide-react';
import { z } from 'zod';

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(100, { message: "Display name must be less than 100 characters" }),
  bio: z
    .string()
    .trim()
    .max(2000, { message: "Bio must be less than 2000 characters" }),
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { message: "Invalid color format" }),
  soundcloudUrl: z
    .string()
    .trim()
    .max(500, { message: "SoundCloud URL must be less than 500 characters" })
    .refine(
      (val) =>
        val === '' ||
        /^(https?:\/\/)?([\w.-]+\.)?soundcloud\.com\//i.test(val) ||
        /^(https?:\/\/)?on\.soundcloud\.com\//i.test(val) ||
        /^(https?:\/\/)?w\.soundcloud\.com\//i.test(val),
      { message: "Enter a valid SoundCloud track or playlist URL" }
    ),
});

interface ProfileEditDialogProps {
  profile: {
    id: string;
    display_name: string | null;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    theme_color: string | null;
    background_image: string | null;
    soundcloud_url?: string | null;
  };
  onUpdate: () => void;
}

export const ProfileEditDialog = ({ profile, onUpdate }: ProfileEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [themeColor, setThemeColor] = useState(profile.theme_color || '#9333ea');
  const [backgroundImage, setBackgroundImage] = useState(profile.background_image || '');
  const [soundCloudUrl, setSoundCloudUrl] = useState(profile.soundcloud_url || '');
  const [uploadingBg, setUploadingBg] = useState(false);
  const { toast } = useToast();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify current user owns this profile
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== profile.id) {
      toast({
        title: 'Unauthorized',
        description: 'You can only upload avatars to your own profile',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast({
        title: '✅ Avatar uploaded successfully',
        description: 'Don\'t forget to click "Save Changes" to apply your new avatar!',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify current user owns this profile
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== profile.id) {
      toast({
        title: 'Unauthorized',
        description: 'You can only upload backgrounds to your own profile',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Background image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/bg-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setBackgroundImage(publicUrl);
      toast({
        title: '✅ Background uploaded',
        description: 'Click "Save Changes" to apply!',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Verify current user owns this profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== profile.id) {
        throw new Error('Unauthorized: You can only edit your own profile');
      }

      // Validate input
      const validation = profileSchema.safeParse({
        displayName,
        bio,
        themeColor,
        soundcloudUrl: soundCloudUrl,
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
          theme_color: themeColor,
          background_image: backgroundImage,
          soundcloud_url: soundCloudUrl || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: '✅ Profile saved successfully!',
        description: 'Your changes have been saved and are now visible on your profile',
      });
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'An error occurred',
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
          <Pencil className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Customize your creator profile
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl bg-gradient-hero text-primary-foreground">
                {displayName?.[0]?.toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="avatar" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Avatar
                  </>
                )}
              </div>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

        <div className="space-y-2">
          <Label htmlFor="soundcloudUrl">SoundCloud URL</Label>
          <Input
            id="soundcloudUrl"
            value={soundCloudUrl}
            onChange={(e) => setSoundCloudUrl(e.target.value)}
            placeholder="https://soundcloud.com/artist/track-or-playlist"
          />
          <p className="text-xs text-muted-foreground">
            Paste a public track or playlist link to show a player on your profile.
          </p>
        </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={profile.username}
              disabled
              className="opacity-50"
            />
            <p className="text-xs text-muted-foreground">Username cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="themeColor">Theme Color</Label>
            <div className="flex gap-2">
              <Input
                id="themeColor"
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#9333ea"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">Background Wallpaper</Label>
            <div className="flex flex-col gap-2">
              {backgroundImage && (
                <div className="relative w-full h-24 rounded-md overflow-hidden border">
                  <img src={backgroundImage} alt="Background preview" className="w-full h-full object-cover" />
                </div>
              )}
              <Label htmlFor="background" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 text-sm border rounded-md p-3 hover:bg-accent transition-colors">
                  {uploadingBg ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {backgroundImage ? 'Change Background' : 'Upload Background'}
                    </>
                  )}
                </div>
                <Input
                  id="background"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBackgroundUpload}
                  disabled={uploadingBg}
                />
              </Label>
              {backgroundImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBackgroundImage('')}
                >
                  Remove Background
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};