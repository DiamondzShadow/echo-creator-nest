-- Add policy to allow users to insert tips via edge function
CREATE POLICY "Allow service role to insert tips"
ON public.tips
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add policy to allow everyone to view all tips (public tipping history)
CREATE POLICY "Everyone can view tips"
ON public.tips
FOR SELECT
USING (true);