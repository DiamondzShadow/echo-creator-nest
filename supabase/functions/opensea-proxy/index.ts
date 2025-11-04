import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENSEA_API_KEY = Deno.env.get('OPENSEA_API_KEY');
const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const walletAddress = url.searchParams.get('wallet');
    const chain = url.searchParams.get('chain');
    const limit = url.searchParams.get('limit') || '50';
    const contractAddress = url.searchParams.get('contract');
    const tokenId = url.searchParams.get('tokenId');

    if (!OPENSEA_API_KEY) {
      throw new Error('OpenSea API key not configured');
    }

    let openSeaUrl = '';

    switch (action) {
      case 'getNFTsByWallet':
        if (!walletAddress) {
          throw new Error('Wallet address is required');
        }
        openSeaUrl = chain
          ? `${OPENSEA_API_BASE}/chain/${chain}/account/${walletAddress}/nfts?limit=${limit}`
          : `${OPENSEA_API_BASE}/account/${walletAddress}/nfts?limit=${limit}`;
        break;

      case 'getNFTsByContract':
        if (!contractAddress || !chain) {
          throw new Error('Contract address and chain are required');
        }
        openSeaUrl = `${OPENSEA_API_BASE}/chain/${chain}/contract/${contractAddress}/nfts?limit=${limit}`;
        break;

      case 'getNFT':
        if (!contractAddress || !tokenId || !chain) {
          throw new Error('Contract address, token ID, and chain are required');
        }
        openSeaUrl = `${OPENSEA_API_BASE}/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`;
        break;

      case 'getCollectionStats':
        const collectionSlug = url.searchParams.get('collectionSlug');
        if (!collectionSlug) {
          throw new Error('Collection slug is required');
        }
        openSeaUrl = `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`;
        break;

      case 'getCollection':
        const slug = url.searchParams.get('collectionSlug');
        if (!slug) {
          throw new Error('Collection slug is required');
        }
        openSeaUrl = `${OPENSEA_API_BASE}/collections/${slug}`;
        break;

      default:
        throw new Error('Invalid action specified');
    }

    console.log('Fetching from OpenSea:', openSeaUrl);

    const response = await fetch(openSeaUrl, {
      headers: {
        'X-API-KEY': OPENSEA_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenSea API error:', response.status, errorText);
      throw new Error(`OpenSea API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in opensea-proxy:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch from OpenSea',
        details: error instanceof Error ? error.toString() : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
