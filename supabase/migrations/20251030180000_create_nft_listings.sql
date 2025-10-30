-- Create nft_listings table for NFT marketplace
CREATE TABLE public.nft_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id BIGINT NOT NULL UNIQUE, -- On-chain listing ID
  
  -- NFT Details
  nft_contract_address TEXT NOT NULL,
  token_id BIGINT NOT NULL,
  token_uri TEXT,
  
  -- Creator/Seller Information
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_wallet_address TEXT NOT NULL,
  
  -- Listing Details
  price NUMERIC NOT NULL,
  payment_token_address TEXT, -- NULL for native currency (ETH/MATIC)
  payment_token_symbol TEXT DEFAULT 'ETH',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- active, sold, cancelled
  
  -- NFT Metadata (cached from IPFS)
  name TEXT,
  description TEXT,
  image_url TEXT,
  attributes JSONB,
  
  -- Royalty Information
  royalty_percentage NUMERIC DEFAULT 0,
  royalty_recipient TEXT,
  
  -- Transaction Information
  transaction_hash TEXT, -- Transaction hash of listing creation
  block_number BIGINT,
  
  -- Timestamps
  listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'sold', 'cancelled')),
  CONSTRAINT positive_price CHECK (price > 0),
  CONSTRAINT unique_active_listing UNIQUE (nft_contract_address, token_id, status) 
    WHERE status = 'active'
);

-- Enable RLS
ALTER TABLE public.nft_listings ENABLE ROW LEVEL SECURITY;

-- Everyone can view active listings
CREATE POLICY "Everyone can view NFT listings"
ON public.nft_listings
FOR SELECT
USING (true);

-- Users can create their own listings
CREATE POLICY "Users can create their own NFT listings"
ON public.nft_listings
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Users can update their own listings
CREATE POLICY "Users can update their own NFT listings"
ON public.nft_listings
FOR UPDATE
USING (auth.uid() = seller_id);

-- Users can delete their own listings
CREATE POLICY "Users can delete their own NFT listings"
ON public.nft_listings
FOR DELETE
USING (auth.uid() = seller_id);

-- Create indexes for efficient queries
CREATE INDEX idx_nft_listings_seller_id ON public.nft_listings(seller_id);
CREATE INDEX idx_nft_listings_creator_id ON public.nft_listings(creator_id);
CREATE INDEX idx_nft_listings_status ON public.nft_listings(status);
CREATE INDEX idx_nft_listings_nft_contract ON public.nft_listings(nft_contract_address);
CREATE INDEX idx_nft_listings_token_id ON public.nft_listings(token_id);
CREATE INDEX idx_nft_listings_listing_id ON public.nft_listings(listing_id);
CREATE INDEX idx_nft_listings_price ON public.nft_listings(price);
CREATE INDEX idx_nft_listings_listed_at ON public.nft_listings(listed_at DESC);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_nft_listings_updated_at
BEFORE UPDATE ON public.nft_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for nft_listings
ALTER PUBLICATION supabase_realtime ADD TABLE public.nft_listings;
