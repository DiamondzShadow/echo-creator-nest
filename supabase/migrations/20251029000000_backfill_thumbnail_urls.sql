-- Backfill thumbnail URLs for existing assets that don't have them
-- Livepeer automatically generates thumbnails for all video assets

UPDATE public.assets
SET thumbnail_url = 'https://livepeer.studio/api/playback/' || livepeer_playback_id || '/thumbnail.jpg',
    updated_at = NOW()
WHERE livepeer_playback_id IS NOT NULL 
  AND (thumbnail_url IS NULL OR thumbnail_url = '')
  AND status = 'ready';

-- Add comment to document the thumbnail URL format
COMMENT ON COLUMN public.assets.thumbnail_url IS 'Thumbnail URL from Livepeer. Format: https://livepeer.studio/api/playback/{playbackId}/thumbnail.jpg';
