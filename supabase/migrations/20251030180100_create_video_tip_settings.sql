-- Create video_tip_settings table for custom video tip fees
CREATE TABLE public.video_tip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Video Identification (could be asset_id, livepeer_asset_id, or custom video_id)
  video_id TEXT NOT NULL UNIQUE,
  video_type TEXT NOT NULL DEFAULT 'asset', -- asset, live_stream, fvm_video
  
  -- Creator Information
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_wallet_address TEXT NOT NULL,
  
  -- Custom Tip Fee Settings
  custom_fee_percentage NUMERIC NOT NULL DEFAULT 0, -- 0-5000 (0-50%)
  has_custom_fee BOOLEAN NOT NULL DEFAULT false,
  
  -- On-chain sync status
  synced_to_chain BOOLEAN DEFAULT false,
  transaction_hash TEXT,
  block_number BIGINT,
  
  -- Statistics
  total_tips_received BIGINT DEFAULT 0,
  total_amount_received NUMERIC DEFAULT 0,
  total_custom_fees_earned NUMERIC DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_custom_fee CHECK (custom_fee_percentage >= 0 AND custom_fee_percentage <= 5000),
  CONSTRAINT valid_video_type CHECK (video_type IN ('asset', 'live_stream', 'fvm_video'))
);

-- Enable RLS
ALTER TABLE public.video_tip_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view tip settings
CREATE POLICY "Everyone can view video tip settings"
ON public.video_tip_settings
FOR SELECT
USING (true);

-- Users can create tip settings for their own videos
CREATE POLICY "Users can create their own video tip settings"
ON public.video_tip_settings
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

-- Users can update their own video tip settings
CREATE POLICY "Users can update their own video tip settings"
ON public.video_tip_settings
FOR UPDATE
USING (auth.uid() = creator_id);

-- Users can delete their own video tip settings
CREATE POLICY "Users can delete their own video tip settings"
ON public.video_tip_settings
FOR DELETE
USING (auth.uid() = creator_id);

-- Create indexes for efficient queries
CREATE INDEX idx_video_tip_settings_video_id ON public.video_tip_settings(video_id);
CREATE INDEX idx_video_tip_settings_creator_id ON public.video_tip_settings(creator_id);
CREATE INDEX idx_video_tip_settings_has_custom_fee ON public.video_tip_settings(has_custom_fee);
CREATE INDEX idx_video_tip_settings_synced ON public.video_tip_settings(synced_to_chain);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_video_tip_settings_updated_at
BEFORE UPDATE ON public.video_tip_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for video_tip_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_tip_settings;
