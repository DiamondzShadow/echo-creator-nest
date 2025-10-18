-- Add SoundCloud URL to profiles for embedding the official widget
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;

-- Optional: small length guard
ALTER TABLE public.profiles
  ADD CONSTRAINT IF NOT EXISTS soundcloud_url_length CHECK (soundcloud_url IS NULL OR length(soundcloud_url) <= 500);
