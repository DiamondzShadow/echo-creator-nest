-- Create video_tips table for video-specific tipping
CREATE TABLE IF NOT EXISTS public.video_tips (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_wallet_address text NOT NULL,
    to_wallet_address text NOT NULL,
    amount text NOT NULL,
    network text NOT NULL,
    transaction_hash text NOT NULL UNIQUE,
    block_number bigint,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_tips_video_id ON public.video_tips(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tips_from_user_id ON public.video_tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_video_tips_to_user_id ON public.video_tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_video_tips_transaction_hash ON public.video_tips(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_video_tips_created_at ON public.video_tips(created_at DESC);

-- Enable RLS
ALTER TABLE public.video_tips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view video tips"
    ON public.video_tips FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own sent tips"
    ON public.video_tips FOR SELECT
    TO authenticated
    USING (auth.uid() = from_user_id);

CREATE POLICY "Users can view tips they received"
    ON public.video_tips FOR SELECT
    TO authenticated
    USING (auth.uid() = to_user_id);

-- Allow service role to insert (used by edge function)
CREATE POLICY "Service role can insert video tips"
    ON public.video_tips FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_video_tips_updated_at
    BEFORE UPDATE ON public.video_tips
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT ON public.video_tips TO authenticated;
GRANT ALL ON public.video_tips TO service_role;

-- Add comment
COMMENT ON TABLE public.video_tips IS 'Stores video-specific tips sent through the VideoTipping smart contract';
