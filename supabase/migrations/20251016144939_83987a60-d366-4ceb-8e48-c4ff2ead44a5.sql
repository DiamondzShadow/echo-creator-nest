-- Create enum for blockchain networks
CREATE TYPE public.blockchain_network AS ENUM ('ethereum', 'polygon', 'base', 'arbitrum', 'optimism');

-- Create tips table to track all crypto tips
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_wallet_address TEXT NOT NULL,
  to_wallet_address TEXT NOT NULL,
  amount TEXT NOT NULL, -- Store as string to handle big numbers
  token_address TEXT, -- NULL for native ETH/MATIC etc
  token_symbol TEXT NOT NULL,
  network blockchain_network NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- For additional data like message, etc
);

-- Create index for faster queries
CREATE INDEX idx_tips_to_user ON public.tips(to_user_id);
CREATE INDEX idx_tips_from_user ON public.tips(from_user_id);
CREATE INDEX idx_tips_transaction ON public.tips(transaction_hash);

-- Enable RLS
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Everyone can view tips (public transparency)
CREATE POLICY "Everyone can view tips"
  ON public.tips
  FOR SELECT
  USING (true);

-- Only authenticated users can insert their own tips
CREATE POLICY "Users can record their own tips"
  ON public.tips
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id OR from_user_id IS NULL);

-- Add wallet_address to profiles for crypto payments
ALTER TABLE public.profiles 
ADD COLUMN wallet_address TEXT UNIQUE,
ADD COLUMN tip_count INTEGER DEFAULT 0,
ADD COLUMN total_tips_received NUMERIC(78, 0) DEFAULT 0; -- Big enough for wei amounts

-- Function to update tip stats
CREATE OR REPLACE FUNCTION public.update_tip_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment tip count for recipient
  UPDATE public.profiles
  SET tip_count = tip_count + 1
  WHERE id = NEW.to_user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update tip stats
CREATE TRIGGER on_tip_created
  AFTER INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tip_stats();

-- Enable realtime for tips
ALTER PUBLICATION supabase_realtime ADD TABLE public.tips;