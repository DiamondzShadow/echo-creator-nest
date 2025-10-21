-- Fix security definer view warning by dropping and recreating without security definer
-- The view was incorrectly flagged; we'll recreate it to ensure it's properly configured
DROP VIEW IF EXISTS public.tip_leaderboard;

-- Recreate as a standard view (uses invoker's permissions, not definer's)
CREATE VIEW public.tip_leaderboard
WITH (security_invoker = true) AS
SELECT 
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.tip_count,
  p.total_tips_received
FROM public.profiles p
WHERE p.total_tips_received > 0
ORDER BY p.total_tips_received DESC;

-- Grant access to the view
GRANT SELECT ON public.tip_leaderboard TO authenticated, anon;