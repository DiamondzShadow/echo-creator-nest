/**
 * OpenSea API Integration
 * Provides access to OpenSea marketplace data, NFT collections, and trading activity
 */

const OPENSEA_API_KEY = import.meta.env.VITE_OPENSEA_API_KEY;
const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// Chain mapping for OpenSea API
export const CHAIN_MAP: Record<string, string> = {
  'ethereum': 'ethereum',
  'polygon': 'matic',
  'arbitrum': 'arbitrum',
  'arbitrum-nova': 'arbitrum_nova',
  'avalanche': 'avalanche',
  'base': 'base',
  'bsc': 'bsc',
  'klaytn': 'klaytn',
  'optimism': 'optimism',
  'solana': 'solana',
  'zora': 'zora',
};

export interface OpenSeaNFT {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description: string;
  image_url: string;
  metadata_url: string;
  opensea_url: string;
  updated_at: string;
  is_disabled: boolean;
  is_nsfw: boolean;
}

export interface OpenSeaCollection {
  collection: string;
  name: string;
  description: string;
  image_url: string;
  banner_image_url: string;
  owner: string;
  safelist_status: string;
  category: string;
  is_disabled: boolean;
  is_nsfw: boolean;
  trait_offers_enabled: boolean;
  opensea_url: string;
  project_url: string;
  wiki_url: string;
  discord_url: string;
  telegram_url: string;
  twitter_username: string;
  instagram_username: string;
  contracts: Array<{
    address: string;
    chain: string;
  }>;
  total_supply: number;
  created_date: string;
}

export interface CollectionStats {
  total_volume: number;
  total_sales: number;
  total_supply: number;
  num_owners: number;
  average_price: number;
  market_cap: number;
  floor_price: number;
  floor_price_symbol: string;
}

export interface NFTActivity {
  event_type: string;
  order_hash: string | null;
  chain: string;
  protocol_address: string | null;
  from_address: string;
  to_address: string;
  quantity: number;
  timestamp: number;
  transaction: string;
  payment: {
    quantity: string;
    token_address: string;
    decimals: number;
    symbol: string;
  } | null;
}

export interface WalletNFT {
  identifier: string;
  collection: string;
  contract: string;
  token_standard: string;
  name: string;
  description: string;
  image_url: string;
  opensea_url: string;
  metadata: any;
  quantity: number;
}

/**
 * Fetch NFTs from a specific contract address
 */
export async function getNFTsByContract(
  contractAddress: string,
  chain: string = 'arbitrum',
  limit: number = 50
): Promise<OpenSeaNFT[]> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts?limit=${limit}`,
      {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error('Error fetching NFTs from OpenSea:', error);
    return [];
  }
}

/**
 * Get collection information
 */
export async function getCollection(
  collectionSlug: string
): Promise<OpenSeaCollection | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/collections/${collectionSlug}`,
      {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching collection from OpenSea:', error);
    return null;
  }
}

/**
 * Get collection stats
 */
export async function getCollectionStats(
  collectionSlug: string
): Promise<CollectionStats | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`,
      {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data.total;
  } catch (error) {
    console.error('Error fetching collection stats from OpenSea:', error);
    return null;
  }
}

/**
 * Get NFTs owned by a wallet address
 */
export async function getNFTsByWallet(
  walletAddress: string,
  chain?: string,
  limit: number = 50
): Promise<WalletNFT[]> {
  try {
    const url = chain
      ? `${OPENSEA_API_BASE}/chain/${CHAIN_MAP[chain]}/account/${walletAddress}/nfts?limit=${limit}`
      : `${OPENSEA_API_BASE}/account/${walletAddress}/nfts?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': OPENSEA_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error('Error fetching wallet NFTs from OpenSea:', error);
    return [];
  }
}

/**
 * Get single NFT details
 */
export async function getNFT(
  contractAddress: string,
  tokenId: string,
  chain: string = 'arbitrum'
): Promise<OpenSeaNFT | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts/${tokenId}`,
      {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data.nft;
  } catch (error) {
    console.error('Error fetching NFT from OpenSea:', error);
    return null;
  }
}

/**
 * Get NFT trading activity
 */
export async function getNFTActivity(
  contractAddress: string,
  tokenId: string,
  chain: string = 'arbitrum',
  limit: number = 20
): Promise<NFTActivity[]> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/events/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts/${tokenId}?limit=${limit}`,
      {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data.asset_events || [];
  } catch (error) {
    console.error('Error fetching NFT activity from OpenSea:', error);
    return [];
  }
}

/**
 * Generate OpenSea URL for an NFT
 */
export function getOpenSeaURL(
  contractAddress: string,
  tokenId: string | number,
  chain: string = 'arbitrum'
): string {
  const chainPath = CHAIN_MAP[chain] || chain;
  return `https://opensea.io/assets/${chainPath}/${contractAddress}/${tokenId}`;
}

/**
 * Generate OpenSea collection URL
 */
export function getOpenSeaCollectionURL(
  contractAddress: string,
  chain: string = 'arbitrum'
): string {
  const chainPath = CHAIN_MAP[chain] || chain;
  return `https://opensea.io/assets/${chainPath}/${contractAddress}`;
}

/**
 * Format price from wei to ETH
 */
export function formatPrice(wei: string, decimals: number = 18): string {
  const value = BigInt(wei) / BigInt(10 ** decimals);
  return value.toString();
}

/**
 * Get trending collections
 */
export async function getTrendingCollections(limit: number = 10): Promise<any[]> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/collections?order_by=seven_day_volume&limit=${limit}`,
      {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();
    return data.collections || [];
  } catch (error) {
    console.error('Error fetching trending collections from OpenSea:', error);
    return [];
  }
}
