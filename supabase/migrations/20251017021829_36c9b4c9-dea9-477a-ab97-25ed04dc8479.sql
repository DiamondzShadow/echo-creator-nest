-- Create private schema for sensitive data
CREATE SCHEMA IF NOT EXISTS private;

-- Create private table for stream credentials
CREATE TABLE private.stream_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  stream_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(stream_id)
);

-- Enable RLS on stream credentials
ALTER TABLE private.stream_credentials ENABLE ROW LEVEL SECURITY;

-- Only stream owners can view their own stream keys
CREATE POLICY "Users can view their own stream keys" ON private.stream_credentials
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.live_streams 
    WHERE live_streams.id = stream_credentials.stream_id 
    AND live_streams.user_id = auth.uid()
  )
);

-- Only stream owners can insert their own stream keys
CREATE POLICY "Users can insert their own stream keys" ON private.stream_credentials
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.live_streams 
    WHERE live_streams.id = stream_credentials.stream_id 
    AND live_streams.user_id = auth.uid()
  )
);

-- Remove stream_key from public table (it's now in private table)
ALTER TABLE public.live_streams DROP COLUMN IF EXISTS stream_key;

-- Add database-level input validation constraints
ALTER TABLE public.live_streams 
  ADD CONSTRAINT title_length CHECK (length(title) <= 200),
  ADD CONSTRAINT description_length CHECK (length(description) <= 2000);

ALTER TABLE public.profiles 
  ADD CONSTRAINT bio_length CHECK (length(bio) <= 2000),
  ADD CONSTRAINT username_length CHECK (length(username) <= 50),
  ADD CONSTRAINT display_name_length CHECK (length(display_name) <= 100);