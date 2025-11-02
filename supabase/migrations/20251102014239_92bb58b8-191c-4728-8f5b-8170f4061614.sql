-- Add token gating fields to assets table
ALTER TABLE public.assets
ADD COLUMN token_gate_enabled boolean DEFAULT false,
ADD COLUMN required_token_balance numeric DEFAULT 0,
ADD COLUMN token_address text DEFAULT NULL;

COMMENT ON COLUMN public.assets.token_gate_enabled IS 'Whether this video requires token ownership to watch';
COMMENT ON COLUMN public.assets.required_token_balance IS 'Minimum token balance required to watch (in wei/smallest unit)';
COMMENT ON COLUMN public.assets.token_address IS 'ERC-20 token contract address (null = use platform default token)';