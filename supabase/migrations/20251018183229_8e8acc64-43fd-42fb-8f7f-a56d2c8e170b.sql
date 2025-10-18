-- Create enum for platform types
CREATE TYPE platform_type AS ENUM ('youtube', 'twitch', 'tiktok');

-- Create table to store platform OAuth connections
CREATE TABLE public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  platform_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own platform connections"
  ON public.platform_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own connections
CREATE POLICY "Users can create own platform connections"
  ON public.platform_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own platform connections"
  ON public.platform_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own platform connections"
  ON public.platform_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_platform_connections_updated_at
  BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();