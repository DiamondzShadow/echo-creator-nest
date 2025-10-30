-- Create nft_transactions table for tracking NFT sales and transfers
CREATE TABLE public.nft_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction Details
  transaction_hash TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL, -- mint, list, sale, cancel, transfer
  
  -- NFT Details
  nft_contract_address TEXT NOT NULL,
  token_id BIGINT NOT NULL,
  listing_id BIGINT, -- NULL for mints and direct transfers
  
  -- Parties Involved
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_wallet_address TEXT,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_wallet_address TEXT,
  
  -- Financial Details (for sales)
  price NUMERIC,
  payment_token_address TEXT,
  payment_token_symbol TEXT,
  platform_fee NUMERIC DEFAULT 0,
  royalty_amount NUMERIC DEFAULT 0,
  seller_amount NUMERIC,
  
  -- Blockchain Details
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ,
  gas_used BIGINT,
  gas_price NUMERIC,
  network TEXT NOT NULL DEFAULT 'ethereum',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_transaction_type CHECK (
    transaction_type IN ('mint', 'list', 'sale', 'cancel', 'transfer')
  ),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Enable RLS
ALTER TABLE public.nft_transactions ENABLE ROW LEVEL SECURITY;

-- Everyone can view confirmed transactions
CREATE POLICY "Everyone can view confirmed NFT transactions"
ON public.nft_transactions
FOR SELECT
USING (status = 'confirmed');

-- Users can view their own transactions
CREATE POLICY "Users can view their own NFT transactions"
ON public.nft_transactions
FOR SELECT
USING (
  auth.uid() = from_user_id OR 
  auth.uid() = to_user_id
);

-- Service role can insert transactions
CREATE POLICY "Service role can insert NFT transactions"
ON public.nft_transactions
FOR INSERT
WITH CHECK (true);

-- Service role can update transactions
CREATE POLICY "Service role can update NFT transactions"
ON public.nft_transactions
FOR UPDATE
USING (true);

-- Create indexes for efficient queries
CREATE INDEX idx_nft_transactions_hash ON public.nft_transactions(transaction_hash);
CREATE INDEX idx_nft_transactions_type ON public.nft_transactions(transaction_type);
CREATE INDEX idx_nft_transactions_nft_contract ON public.nft_transactions(nft_contract_address);
CREATE INDEX idx_nft_transactions_token_id ON public.nft_transactions(token_id);
CREATE INDEX idx_nft_transactions_from_user ON public.nft_transactions(from_user_id);
CREATE INDEX idx_nft_transactions_to_user ON public.nft_transactions(to_user_id);
CREATE INDEX idx_nft_transactions_status ON public.nft_transactions(status);
CREATE INDEX idx_nft_transactions_listing_id ON public.nft_transactions(listing_id);
CREATE INDEX idx_nft_transactions_block_timestamp ON public.nft_transactions(block_timestamp DESC);
CREATE INDEX idx_nft_transactions_created_at ON public.nft_transactions(created_at DESC);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_nft_transactions_updated_at
BEFORE UPDATE ON public.nft_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for nft_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_transactions;
