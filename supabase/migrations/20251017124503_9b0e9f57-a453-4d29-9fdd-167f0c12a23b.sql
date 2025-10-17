-- Fix 1: Create the assets table for webhook functionality
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stream_id uuid REFERENCES public.live_streams(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  livepeer_asset_id text UNIQUE NOT NULL,
  livepeer_playback_id text,
  status text NOT NULL CHECK (status IN ('processing', 'ready', 'failed')),
  duration numeric,
  size bigint,
  thumbnail_url text,
  ready_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on assets table
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own assets
CREATE POLICY "Users can view own assets" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

-- Allow public viewing of assets (for public recordings)
CREATE POLICY "Public can view assets" ON public.assets
  FOR SELECT USING (true);

-- Add index for faster queries
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_stream_id ON public.assets(stream_id);
CREATE INDEX idx_assets_livepeer_asset_id ON public.assets(livepeer_asset_id);

-- Add updated_at trigger
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to document the table
COMMENT ON TABLE public.assets IS 'Stores recorded stream assets from Livepeer. Created via webhook after stream recording ends.';

-- Fix 2: Remove overly permissive INSERT policy from tips table
DROP POLICY IF EXISTS "Users can record their own tips" ON public.tips;

-- Add comment to document that tips must be created via edge function
COMMENT ON TABLE public.tips IS 'Cryptocurrency tips between users. Tips are created ONLY via the record-tip edge function after blockchain verification. Direct inserts are not permitted.';