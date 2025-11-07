-- Add sol_address column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN sol_address text;

-- Add index for sol_address lookups
CREATE INDEX idx_profiles_sol_address ON public.profiles(sol_address) WHERE sol_address IS NOT NULL;