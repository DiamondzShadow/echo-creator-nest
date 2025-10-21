-- Fix tips table RLS to restrict access (INFO_LEAKAGE: tips_metadata_exposure)
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Everyone can view tips" ON public.tips;

-- Allow users to view their own tips (sent or received)
CREATE POLICY "Users can view their own tips"
ON public.tips
FOR SELECT
USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

-- Create aggregated leaderboard view for public display (no wallet addresses)
CREATE OR REPLACE VIEW public.tip_leaderboard AS
SELECT 
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  COUNT(t.id) as tip_count,
  p.total_tips_received
FROM public.profiles p
LEFT JOIN public.tips t ON p.id = t.to_user_id
GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.total_tips_received
ORDER BY p.total_tips_received DESC;

-- Grant access to the view
GRANT SELECT ON public.tip_leaderboard TO authenticated, anon;