-- Fix video upload failures by ensuring correct status constraint
-- This migration ensures the assets table accepts all valid Livepeer status values

-- Drop existing constraint if any
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;

-- Add comprehensive status constraint
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting', 'deleted'));

-- Add helpful comment
COMMENT ON COLUMN public.assets.status IS 'Asset status from Livepeer API: waiting (uploaded, not yet processing), processing (transcoding), ready (available for playback), failed (processing error), deleting (deletion in progress), deleted (removed from Livepeer)';

-- Ensure all required columns exist with proper defaults
ALTER TABLE assets 
  ADD COLUMN IF NOT EXISTS ipfs_cid text,
  ADD COLUMN IF NOT EXISTS ipfs_url text,
  ADD COLUMN IF NOT EXISTS ipfs_gateway_url text,
  ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'livepeer',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS views integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_gate_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_token_balance text,
  ADD COLUMN IF NOT EXISTS token_address text;

-- Ensure critical indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_livepeer_asset_id ON assets(livepeer_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_is_public ON assets(is_public) WHERE is_public = true;

-- Update any existing failed assets from the last hour to 'waiting' for retry
-- This gives them a chance to be picked up by the refresh function
UPDATE assets 
SET status = 'waiting', 
    updated_at = NOW()
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '1 hour'
  AND livepeer_asset_id IS NOT NULL;

-- Add helpful function to refresh stuck assets
CREATE OR REPLACE FUNCTION refresh_stuck_assets()
RETURNS TABLE(
  asset_id uuid,
  title text,
  old_status text,
  new_status text,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.status,
    CASE 
      WHEN a.created_at < NOW() - INTERVAL '10 minutes' AND a.status = 'waiting' THEN 'failed'::text
      WHEN a.updated_at < NOW() - INTERVAL '10 minutes' AND a.status = 'processing' THEN 'processing'::text
      ELSE a.status
    END as new_status,
    CASE 
      WHEN a.created_at < NOW() - INTERVAL '10 minutes' AND a.status = 'waiting' THEN 'Marked as failed - stuck in waiting for too long'
      WHEN a.updated_at < NOW() - INTERVAL '10 minutes' AND a.status = 'processing' THEN 'Still processing - may need manual check'
      ELSE 'No action needed'
    END as message
  FROM assets a
  WHERE a.status IN ('waiting', 'processing')
  AND (
    (a.status = 'waiting' AND a.created_at < NOW() - INTERVAL '10 minutes') OR
    (a.status = 'processing' AND a.updated_at < NOW() - INTERVAL '10 minutes')
  );
  
  -- Update assets that have been waiting too long
  UPDATE assets 
  SET status = 'failed', 
      updated_at = NOW()
  WHERE status = 'waiting' 
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION refresh_stuck_assets() IS 'Helper function to identify and fix assets stuck in waiting/processing status for too long. Run this if you see assets not progressing.';
