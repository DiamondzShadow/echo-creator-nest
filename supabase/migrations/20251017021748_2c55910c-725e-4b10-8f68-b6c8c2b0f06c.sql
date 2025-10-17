-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that allows everyone to see basic profile info
-- but only authenticated users can see wallet addresses
CREATE POLICY "Public can view basic profiles" ON public.profiles
FOR SELECT USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN true  -- Authenticated users see all fields
    ELSE wallet_address IS NULL  -- Unauthenticated users only see profiles without exposed wallets
  END
);

-- Add a second policy to ensure authenticated users can always see all profiles
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles
FOR SELECT USING (auth.uid() IS NOT NULL);