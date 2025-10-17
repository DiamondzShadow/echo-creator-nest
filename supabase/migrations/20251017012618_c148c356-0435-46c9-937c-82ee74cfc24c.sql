-- Add customization columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS background_image TEXT DEFAULT NULL;