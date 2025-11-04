-- Add XRP to the blockchain_network enum
ALTER TYPE blockchain_network ADD VALUE IF NOT EXISTS 'xrp';

-- Add XRP address field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xrp_address text;

COMMENT ON COLUMN profiles.xrp_address IS 'User XRP Ledger wallet address';
