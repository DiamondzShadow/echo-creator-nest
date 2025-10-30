/**
 * NFT Metadata Utilities
 * Handles NFT metadata formatting and storage for OpenSea/wallet compatibility
 */

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    creator?: string;
    royalty?: number;
  };
}

/**
 * Create OpenSea-compatible metadata JSON
 */
export function createNFTMetadata(
  name: string,
  description: string,
  imageUrl: string,
  creator?: string,
  royalty?: number,
  attributes?: Array<{ trait_type: string; value: string | number }>
): NFTMetadata {
  const metadata: NFTMetadata = {
    name,
    description,
    image: imageUrl,
    external_url: `https://creatorhub.io/nft/${name.toLowerCase().replace(/\s+/g, '-')}`,
  };

  if (attributes && attributes.length > 0) {
    metadata.attributes = attributes;
  }

  if (creator || royalty !== undefined) {
    metadata.properties = {};
    if (creator) metadata.properties.creator = creator;
    if (royalty !== undefined) metadata.properties.royalty = royalty;
  }

  return metadata;
}

/**
 * Upload metadata to a temporary storage or IPFS
 * For now, we'll create a data URI that embeds the metadata
 * In production, this should upload to IPFS or Arweave
 */
export function createMetadataURI(metadata: NFTMetadata): string {
  // Convert metadata to JSON string
  const metadataJson = JSON.stringify(metadata);
  
  // Create a base64-encoded data URI
  // This allows the metadata to be embedded directly in the NFT
  const base64Metadata = btoa(metadataJson);
  return `data:application/json;base64,${base64Metadata}`;
}

/**
 * Parse metadata from URI
 * Handles both data URIs and IPFS URIs
 */
export async function fetchMetadata(uri: string): Promise<NFTMetadata | null> {
  try {
    // Handle data URIs
    if (uri.startsWith('data:application/json;base64,')) {
      const base64Data = uri.replace('data:application/json;base64,', '');
      const jsonString = atob(base64Data);
      return JSON.parse(jsonString);
    }

    // Handle IPFS URIs
    if (uri.startsWith('ipfs://')) {
      const ipfsHash = uri.replace('ipfs://', '');
      const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
      if (!response.ok) {
        throw new Error('Failed to fetch from IPFS');
      }
      return await response.json();
    }

    // Handle regular HTTP(S) URIs
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

/**
 * Validate metadata structure
 */
export function validateMetadata(metadata: any): metadata is NFTMetadata {
  return (
    typeof metadata === 'object' &&
    metadata !== null &&
    typeof metadata.name === 'string' &&
    typeof metadata.description === 'string' &&
    typeof metadata.image === 'string'
  );
}

/**
 * Convert image to IPFS URL or data URI
 * For production, this should upload to IPFS
 */
export async function prepareImageForNFT(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // In production, upload to IPFS here and return the IPFS URL
      // For now, return the data URL
      resolve(dataUrl);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Format image URL for display
 * Handles IPFS, data URIs, and regular URLs
 */
export function formatImageUrl(imageUrl: string): string {
  if (!imageUrl) {
    return '/placeholder.svg';
  }

  // Convert IPFS URLs to HTTP gateway URLs
  if (imageUrl.startsWith('ipfs://')) {
    const ipfsHash = imageUrl.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  // Data URIs and regular URLs can be used directly
  return imageUrl;
}

/**
 * Check if metadata URI is valid
 */
export function isValidMetadataURI(uri: string): boolean {
  if (!uri || typeof uri !== 'string') {
    return false;
  }

  // Accept data URIs, IPFS URIs, and HTTP(S) URIs
  return (
    uri.startsWith('data:application/json;base64,') ||
    uri.startsWith('ipfs://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  );
}

/**
 * Create a fallback metadata for NFTs with invalid URIs
 */
export function createFallbackMetadata(tokenId: number): NFTMetadata {
  return {
    name: `Creator NFT #${tokenId}`,
    description: 'A unique NFT from CreatorHub',
    image: '/placeholder.svg',
    attributes: [
      {
        trait_type: 'Token ID',
        value: tokenId,
      },
    ],
  };
}
