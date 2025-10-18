-- Create stream_reactions table for live and VOD reactions
CREATE TABLE public.stream_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like','unlike','love','what','lmao')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can read reactions for a stream (public counters/UI)
CREATE POLICY "Anyone can view reactions" ON public.stream_reactions
  FOR SELECT USING (true);

-- Authenticated users can react
CREATE POLICY "Authenticated users can react" ON public.stream_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reaction (toggle/switch)
CREATE POLICY "Users can update their reaction" ON public.stream_reactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reaction
CREATE POLICY "Users can delete their reaction" ON public.stream_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance and uniqueness
CREATE INDEX idx_stream_reactions_stream_id ON public.stream_reactions(stream_id);
CREATE INDEX idx_stream_reactions_user_id ON public.stream_reactions(user_id);
CREATE INDEX idx_stream_reactions_created_at ON public.stream_reactions(created_at DESC);

-- Enforce exactly one reaction per (user, stream)
-- Switching reaction updates the single row via UPSERT on (stream_id, user_id)
CREATE UNIQUE INDEX uniq_stream_user ON public.stream_reactions(stream_id, user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_reactions;

COMMENT ON TABLE public.stream_reactions IS 'Per-user reactions to streams and recordings (like, unlike, love, what, lmao).';
