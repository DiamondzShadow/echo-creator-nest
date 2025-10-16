-- Create assets table for storing Livepeer recordings
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Livepeer asset information
  livepeer_asset_id TEXT UNIQUE NOT NULL,
  livepeer_playback_id TEXT,
  
  -- Asset status from Livepeer
  status TEXT DEFAULT 'processing', -- processing, ready, failed
  duration NUMERIC, -- duration in seconds
  size BIGINT, -- file size in bytes
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at TIMESTAMPTZ -- when asset became ready for playback
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Everyone can view assets
CREATE POLICY "Everyone can view assets"
ON public.assets
FOR SELECT
USING (true);

-- Users can create their own assets
CREATE POLICY "Users can create their own assets"
ON public.assets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own assets
CREATE POLICY "Users can update their own assets"
ON public.assets
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own assets
CREATE POLICY "Users can delete their own assets"
ON public.assets
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for assets
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;

-- Create index for efficient queries
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_stream_id ON public.assets(stream_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_livepeer_asset_id ON public.assets(livepeer_asset_id);
