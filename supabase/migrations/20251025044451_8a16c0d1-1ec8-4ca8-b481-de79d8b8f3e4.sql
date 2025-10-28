-- Drop the restrictive public view policy
DROP POLICY IF EXISTS "Public can view basic profiles" ON public.profiles;

-- Create a new policy allowing everyone to view profiles
CREATE POLICY "Everyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);