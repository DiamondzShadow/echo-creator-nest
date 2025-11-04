/**
 * OpenSea API Integration
 * Provides access to OpenSea marketplace data, NFT collections, and trading activity
 * Uses Supabase Edge Function to avoid CORS issues
 */

import { supabase } from '@/integrations/supabase/client';

const OPENSEA_API_KEY = import.meta.env.VITE_OPENSEA_API_KEY;
const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// Use Supabase Edge Function for API calls to avoid CORS
// Set to false to try direct API calls (may have CORS issues)
const USE_EDGE_FUNCTION = false;

// Chain mapping for OpenSea API
export const CHAIN_MAP: Record<string, string> = {
  'abstract': 'abstract',
  'arbitrum': 'arbitrum',
  'arbitrum-nova': 'arbitrum_nova',
  'arbitrum-sepolia': 'arbitrum_sepolia',
  'avalanche': 'avalanche',
  'avalanche-fuji': 'avalanche_fuji',
  'base': 'base',
  'base-sepolia': 'base_sepolia',
  'blast': 'blast',
  'blast-sepolia': 'blast_sepolia',
  'bsc': 'bsc',
  'bsc-testnet': 'bsc_testnet',
  'ethereum': 'ethereum',
  'gunzilla': 'gunzilla',
  'klaytn': 'klaytn',
  'klaytn-baobab': 'klaytn_baobab',
  'matic': 'matic',
  'polygon': 'matic',
  'mumbai': 'mumbai',
  'optimism': 'optimism',
  'optimism-sepolia': 'optimism_sepolia',
  'sepolia': 'sepolia',
  'solana': 'solana',
  'solana-devnet': 'soldev',
  'zora': 'zora',
  'zora-sepolia': 'zora_sepolia',
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

export type EventType = 'sale' | 'order' | 'cancel' | 'transfer' | 'redemption';

export interface EventsResponse {
  asset_events: AssetEvent[];
  next: string | null;
}

export interface AssetEvent {
  event_type: EventType;
  order_hash?: string;
  maker?: string;
  event_timestamp: number;
  nft?: {
    identifier: string;
    collection: string;
    contract: string;
    token_standard: string;
    name: string;
    description: string;
    image_url: string;
    display_image_url?: string;
    display_animation_url?: string;
    metadata_url: string;
    opensea_url: string;
    updated_at: string;
    is_disabled: boolean;
    is_nsfw: boolean;
  };
}

export interface TraitCategory {
  [key: string]: 'string' | 'number' | 'date';
}

export interface TraitCounts {
  [category: string]: {
    [value: string]: number;
  } | {
    min: number;
    max: number;
  };
}

export interface TraitsResponse {
  categories: TraitCategory;
  counts: TraitCounts;
}

export interface SeaportOrder {
  created_date: string;
  closing_date: string;
  listing_time: number;
  expiration_time: number;
  order_hash: string;
  protocol_data: {
    parameters: {
      offerer: string;
      offer: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
      }>;
      consideration: Array<{
        itemType: number;
        token: string;
        identifierOrCriteria: string;
        startAmount: string;
        endAmount: string;
        recipient: string;
      }>;
      startTime: string;
      endTime: string;
      orderType: number;
      zone: string;
      zoneHash: string;
      salt: string;
      conduitKey: string;
      totalOriginalConsiderationItems: number;
      counter: number;
    };
    signature: string;
  };
  protocol_address: string;
  maker: {
    user: number;
    profile_img_url: string;
    address: string;
    config: string;
  };
  taker: {
    user: number;
    profile_img_url: string;
    address: string;
    config: string;
  } | null;
  current_price: string;
  maker_fees: Array<{
    account: {
      user: number | null;
      profile_img_url: string;
      address: string;
      config: string;
    };
    basis_points: string;
  }>;
  taker_fees: Array<{
    account: {
      user: number | null;
      profile_img_url: string;
      address: string;
      config: string;
    };
    basis_points: string;
  }>;
  side: 'ask' | 'bid';
  order_type: 'basic' | 'english' | 'dutch' | 'criteria';
  cancelled: boolean;
  finalized: boolean;
  marked_invalid: boolean;
}

export interface Listing extends SeaportOrder {
  type: 'listing';
}

export interface Offer extends SeaportOrder {
  type: 'offer';
  criteria?: {
    collection: {
      slug: string;
    };
    contract: {
      address: string;
    };
    trait?: {
      type: string;
      value: string;
    };
  };
}

export interface ListingsResponse {
  listings: Listing[];
  next?: string;
}

export interface OffersResponse {
  offers: Offer[];
  next?: string;
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
    if (USE_EDGE_FUNCTION) {
      // Use Supabase Edge Function to avoid CORS
      const params = new URLSearchParams({
        action: 'getNFTsByWallet',
        wallet: walletAddress,
        limit: limit.toString(),
      });
      
      if (chain) {
        params.append('chain', CHAIN_MAP[chain] || chain);
      }

      console.log('Fetching NFTs via Edge Function for wallet:', walletAddress, 'chain:', chain || 'all');

      const { data, error } = await supabase.functions.invoke('opensea-proxy', {
        body: {},
        method: 'GET',
      });

      // Construct URL manually since Supabase doesn't support query params in invoke
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supabaseUrl}/functions/v1/opensea-proxy?${params.toString()}`;

      console.log('Calling Edge Function:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error:', errorText);
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('NFTs received from Edge Function:', result);
      return result.nfts || [];
    } else {
      // Direct API call (may have CORS issues)
      const url = chain
        ? `${OPENSEA_API_BASE}/chain/${CHAIN_MAP[chain]}/account/${walletAddress}/nfts?limit=${limit}`
        : `${OPENSEA_API_BASE}/account/${walletAddress}/nfts?limit=${limit}`;

      console.log('Fetching NFTs from OpenSea:', url);
      console.log('Using API key:', OPENSEA_API_KEY ? 'Set' : 'Not set');

      const response = await fetch(url, {
        headers: {
          'X-API-KEY': OPENSEA_API_KEY,
          'Accept': 'application/json',
        },
      });

      console.log('OpenSea API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenSea API error response:', errorText);
        throw new Error(`OpenSea API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenSea API response data:', data);
      return data.nfts || [];
    }
  } catch (error) {
    console.error('Error fetching wallet NFTs from OpenSea:', error);
    throw error; // Re-throw so the caller can handle it
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

/**
 * Get events based on before and after timestamps
 */
export async function getEvents(
  options: {
    after?: number;
    before?: number;
    event_type?: EventType[];
    limit?: number;
    next?: string;
  } = {}
): Promise<EventsResponse> {
  try {
    const params = new URLSearchParams();
    if (options.after) params.append('after', options.after.toString());
    if (options.before) params.append('before', options.before.toString());
    if (options.event_type) {
      options.event_type.forEach(type => params.append('event_type', type));
    }
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.next) params.append('next', options.next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/events?${params.toString()}`,
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
    return {
      asset_events: data.asset_events || [],
      next: data.next || null,
    };
  } catch (error) {
    console.error('Error fetching events from OpenSea:', error);
    return { asset_events: [], next: null };
  }
}

/**
 * Get events by account
 */
export async function getEventsByAccount(
  accountAddress: string,
  options: {
    after?: number;
    before?: number;
    event_type?: EventType[];
    limit?: number;
    next?: string;
  } = {}
): Promise<EventsResponse> {
  try {
    const params = new URLSearchParams();
    if (options.after) params.append('after', options.after.toString());
    if (options.before) params.append('before', options.before.toString());
    if (options.event_type) {
      options.event_type.forEach(type => params.append('event_type', type));
    }
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.next) params.append('next', options.next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/events/account/${accountAddress}?${params.toString()}`,
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
    return {
      asset_events: data.asset_events || [],
      next: data.next || null,
    };
  } catch (error) {
    console.error('Error fetching account events from OpenSea:', error);
    return { asset_events: [], next: null };
  }
}

/**
 * Get events by collection
 */
export async function getEventsByCollection(
  collectionSlug: string,
  options: {
    after?: number;
    before?: number;
    event_type?: EventType[];
    limit?: number;
    next?: string;
  } = {}
): Promise<EventsResponse> {
  try {
    const params = new URLSearchParams();
    if (options.after) params.append('after', options.after.toString());
    if (options.before) params.append('before', options.before.toString());
    if (options.event_type) {
      options.event_type.forEach(type => params.append('event_type', type));
    }
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.next) params.append('next', options.next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/events/collection/${collectionSlug}?${params.toString()}`,
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
    return {
      asset_events: data.asset_events || [],
      next: data.next || null,
    };
  } catch (error) {
    console.error('Error fetching collection events from OpenSea:', error);
    return { asset_events: [], next: null };
  }
}

/**
 * Get events by NFT
 */
export async function getEventsByNFT(
  chain: string,
  contractAddress: string,
  identifier: string,
  options: {
    after?: number;
    before?: number;
    event_type?: EventType[];
    limit?: number;
    next?: string;
  } = {}
): Promise<EventsResponse> {
  try {
    const params = new URLSearchParams();
    if (options.after) params.append('after', options.after.toString());
    if (options.before) params.append('before', options.before.toString());
    if (options.event_type) {
      options.event_type.forEach(type => params.append('event_type', type));
    }
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.next) params.append('next', options.next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/events/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts/${identifier}?${params.toString()}`,
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
    return {
      asset_events: data.asset_events || [],
      next: data.next || null,
    };
  } catch (error) {
    console.error('Error fetching NFT events from OpenSea:', error);
    return { asset_events: [], next: null };
  }
}

/**
 * Get traits in a collection
 */
export async function getTraits(collectionSlug: string): Promise<TraitsResponse | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/traits/${collectionSlug}`,
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
    console.error('Error fetching traits from OpenSea:', error);
    return null;
  }
}

/**
 * Get all listings by collection
 */
export async function getAllListingsByCollection(
  collectionSlug: string,
  limit: number = 50,
  next?: string
): Promise<ListingsResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (next) params.append('next', next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all?${params.toString()}`,
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
    return {
      listings: data.listings || [],
      next: data.next,
    };
  } catch (error) {
    console.error('Error fetching collection listings from OpenSea:', error);
    return { listings: [] };
  }
}

/**
 * Get best listing by NFT
 */
export async function getBestListingByNFT(
  chain: string,
  contractAddress: string,
  identifier: string
): Promise<Listing | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/listings/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts/${identifier}/best`,
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
    console.error('Error fetching best NFT listing from OpenSea:', error);
    return null;
  }
}

/**
 * Get best listings by collection
 */
export async function getBestListingsByCollection(
  collectionSlug: string,
  limit: number = 50,
  next?: string
): Promise<ListingsResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (next) params.append('next', next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/best?${params.toString()}`,
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
    return {
      listings: data.listings || [],
      next: data.next,
    };
  } catch (error) {
    console.error('Error fetching best collection listings from OpenSea:', error);
    return { listings: [] };
  }
}

/**
 * Get all offers by collection
 */
export async function getAllOffersByCollection(
  collectionSlug: string,
  limit: number = 50,
  next?: string
): Promise<OffersResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (next) params.append('next', next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/offers/collection/${collectionSlug}/all?${params.toString()}`,
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
    return {
      offers: data.offers || [],
      next: data.next,
    };
  } catch (error) {
    console.error('Error fetching collection offers from OpenSea:', error);
    return { offers: [] };
  }
}

/**
 * Get best offer by NFT
 */
export async function getBestOfferByNFT(
  chain: string,
  contractAddress: string,
  identifier: string
): Promise<Offer | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/offers/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts/${identifier}/best`,
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
    console.error('Error fetching best NFT offer from OpenSea:', error);
    return null;
  }
}

/**
 * Get collection offers
 */
export async function getCollectionOffers(
  collectionSlug: string,
  limit: number = 50,
  next?: string
): Promise<OffersResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (next) params.append('next', next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/offers/collection/${collectionSlug}?${params.toString()}`,
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
    return {
      offers: data.offers || [],
      next: data.next,
    };
  } catch (error) {
    console.error('Error fetching collection offers from OpenSea:', error);
    return { offers: [] };
  }
}

/**
 * Get item offers
 */
export async function getItemOffers(
  chain: string,
  contractAddress: string,
  identifier: string,
  limit: number = 50,
  next?: string
): Promise<OffersResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (next) params.append('next', next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/offers/chain/${CHAIN_MAP[chain]}/contract/${contractAddress}/nfts/${identifier}?${params.toString()}`,
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
    return {
      offers: data.offers || [],
      next: data.next,
    };
  } catch (error) {
    console.error('Error fetching item offers from OpenSea:', error);
    return { offers: [] };
  }
}

/**
 * Get trait offers
 */
export async function getTraitOffers(
  collectionSlug: string,
  type: string,
  value: string,
  limit: number = 50,
  next?: string
): Promise<OffersResponse> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (next) params.append('next', next);

    const response = await fetch(
      `${OPENSEA_API_BASE}/offers/collection/${collectionSlug}/traits/${type}/${value}?${params.toString()}`,
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
    return {
      offers: data.offers || [],
      next: data.next,
    };
  } catch (error) {
    console.error('Error fetching trait offers from OpenSea:', error);
    return { offers: [] };
  }
}

/**
 * Get order by order hash
 */
export async function getOrder(
  chain: string,
  protocol: string,
  orderHash: string
): Promise<SeaportOrder | null> {
  try {
    const response = await fetch(
      `${OPENSEA_API_BASE}/orders/chain/${CHAIN_MAP[chain]}/protocol/${protocol}/${orderHash}`,
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
    console.error('Error fetching order from OpenSea:', error);
    return null;
  }
}
