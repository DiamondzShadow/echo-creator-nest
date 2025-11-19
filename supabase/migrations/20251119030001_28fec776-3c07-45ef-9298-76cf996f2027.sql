-- Fix video upload status constraint and reset failed uploads
-- This adds support for all status types and resets stuck uploads

-- Drop old constraint if it exists
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;

-- Add updated constraint with all status types
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting', 'deleted'));

-- Reset any stuck uploads to 'waiting' so they can be retried
UPDATE assets 
SET status = 'waiting', 
    updated_at = NOW()
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours';