-- Add stream types and content categories to profiles
ALTER TABLE public.profiles 
ADD COLUMN stream_types TEXT[] DEFAULT '{}',
ADD COLUMN content_categories TEXT[] DEFAULT '{}',
ADD COLUMN location TEXT,
ADD COLUMN social_twitter TEXT,
ADD COLUMN social_instagram TEXT,
ADD COLUMN social_youtube TEXT;