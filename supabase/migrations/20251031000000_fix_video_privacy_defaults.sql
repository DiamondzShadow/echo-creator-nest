-- Fix video privacy: Make videos private by default
-- This migration addresses the critical privacy issue where videos were public by default

-- Step 1: Change the default value of is_public to false (private by default)
ALTER TABLE public.assets 
ALTER COLUMN is_public SET DEFAULT false;

-- Step 2: OPTIONAL - Uncomment the lines below if you want to make ALL existing videos private
-- This gives users full control over their content privacy
-- WARNING: This will make all videos private, users will need to manually make them public

-- UPDATE public.assets 
-- SET is_public = false 
-- WHERE is_public = true;

-- Note: The RLS policy already allows users to see their own videos regardless of privacy:
-- USING (is_public = true OR auth.uid() = user_id)
-- This means:
-- - Private videos (is_public = false): Only visible to the owner
-- - Public videos (is_public = true): Visible to everyone
-- - Users always see their own videos

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.assets.is_public IS 'Video visibility: false = private (owner only), true = public (everyone). Defaults to private for user privacy.';
