-- Fix assets status constraint to include all Livepeer statuses
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting'));

-- Add columns for enhanced storage (IPFS/Arweave)
ALTER TABLE assets 
  ADD COLUMN IF NOT EXISTS ipfs_gateway_url text,
  ADD COLUMN IF NOT EXISTS arweave_url text,
  ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'livepeer';

-- Add stream_key column for blockchain integration
ALTER TABLE live_streams 
  ADD COLUMN IF NOT EXISTS stream_key text,
  ADD COLUMN IF NOT EXISTS total_tips numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enable_recording boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS save_to_storj boolean DEFAULT false;

-- Create index for faster stream lookups
CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_livepeer_asset_id ON assets(livepeer_asset_id);

-- Add realtime for stream_messages if not already added
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'stream_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stream_messages;
  END IF;
END $$;