-- Create stream_messages table for in-app chat during live streams
CREATE TABLE public.stream_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view messages for streams they're watching
CREATE POLICY "Anyone can view stream messages" ON public.stream_messages
  FOR SELECT USING (true);

-- Allow authenticated users to send messages
CREATE POLICY "Authenticated users can send messages" ON public.stream_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_stream_messages_stream_id ON public.stream_messages(stream_id);
CREATE INDEX idx_stream_messages_created_at ON public.stream_messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_messages;

-- Add comment
COMMENT ON TABLE public.stream_messages IS 'Live chat messages during streams. Messages are sent in real-time and visible to all viewers.';