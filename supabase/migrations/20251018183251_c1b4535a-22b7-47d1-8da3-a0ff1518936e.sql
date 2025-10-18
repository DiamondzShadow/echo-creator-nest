-- Create enum for reaction types
CREATE TYPE reaction_type AS ENUM ('like', 'unlike', 'love', 'what', 'lmao');

-- Create stream_reactions table
CREATE TABLE public.stream_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction reaction_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

-- Enable RLS
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

-- Everyone can view reactions
CREATE POLICY "Everyone can view reactions"
  ON public.stream_reactions
  FOR SELECT
  USING (true);

-- Authenticated users can create reactions
CREATE POLICY "Authenticated users can create reactions"
  ON public.stream_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
  ON public.stream_reactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON public.stream_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_reactions;

-- Trigger to update updated_at
CREATE TRIGGER update_stream_reactions_updated_at
  BEFORE UPDATE ON public.stream_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();