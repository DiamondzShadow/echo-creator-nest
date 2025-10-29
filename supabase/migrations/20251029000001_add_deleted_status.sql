-- Add 'deleted' status to assets status constraint
-- This allows tracking when assets are deleted from Livepeer

ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_status_check;
ALTER TABLE assets ADD CONSTRAINT assets_status_check 
  CHECK (status IN ('waiting', 'processing', 'ready', 'failed', 'deleting', 'deleted'));

-- Add comment to document the deleted status
COMMENT ON COLUMN public.assets.status IS 'Asset status from Livepeer: waiting, processing, ready, failed, deleting, deleted';
