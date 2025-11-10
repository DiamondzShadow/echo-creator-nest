-- Add cover_photo_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cover_photo_url text;