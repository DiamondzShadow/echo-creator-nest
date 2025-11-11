import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { NFTCard } from '@/components/NFTCard';
import { NFTMint } from '@/components/NFTMint';
import { OwnedNFTCard } from '@/components/OwnedNFTCard';
import { CollectionStatsCard } from '@/components/CollectionStatsCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount, useReadContract } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Store, Plus, Wallet } from 'lucide-react';
import { CREATOR_NFT_CONTRACT_ADDRESS, CREATOR_NFT_ABI } from '@/lib/web3-config';
import { arbitrum } from 'wagmi/chains';

interface NFTListing {
  id: string;
  listing_id: number;
  nft_contract_address: string;
  token_id: number;
  name: string;
  description: string;
  image_url: string;
  price: number;
  payment_token_symbol: string;
  seller_id: string;
  seller_wallet_address: string;
  royalty_percentage: number;
  status: string;
  seller?: {
    username: string;
  };
}

export default function NFTMarketplace() {
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<NFTListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [isLoadingOwned, setIsLoadingOwned] = useState(false);
  
  const { address } = useAccount();
  const { toast } = useToast();

  // Fetch owned NFT token IDs
  const { data: tokenIds, refetch: refetchTokens } = useReadContract({
    address: CREATOR_NFT_CONTRACT_ADDRESS as `0x${string}`,
    abi: CREATOR_NFT_ABI,
    functionName: 'tokensOfOwner',
    args: address ? [address] : undefined,
    chainId: arbitrum.id,
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, sortBy]);

  useEffect(() => {
    if (tokenIds && address) {
      fetchOwnedNFTsMetadata();
    }
  }, [tokenIds, address]);

  const fetchOwnedNFTsMetadata = async () => {
    if (!tokenIds || tokenIds.length === 0) {
      setOwnedNFTs([]);
      return;
    }

    setIsLoadingOwned(true);
    try {
      const nfts = await Promise.all(
        (tokenIds as bigint[]).map(async (tokenId) => {
          try {
            // Fetch token URI from contract
            const response = await fetch(
              `https://arb1.arbitrum.io/rpc`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'eth_call',
                  params: [
                    {
                      to: CREATOR_NFT_CONTRACT_ADDRESS,
                      data: `0xc87b56dd${tokenId.toString(16).padStart(64, '0')}`, // tokenURI(uint256)
                    },
                    'latest',
                  ],
                  id: 1,
                }),
              }
            );

            const data = await response.json();
            if (data.result) {
              // Decode the result to get the URI
              const uri = decodeURIResult(data.result);
              
              // Fetch metadata from URI
              const metadataResponse = await fetch(uri);
              const metadata = await metadataResponse.json();

              return {
                tokenId: Number(tokenId),
                name: metadata.name || `NFT #${tokenId}`,
                description: metadata.description || '',
                imageUrl: metadata.image || '',
              };
            }
          } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}:`, error);
          }
          
          return {
            tokenId: Number(tokenId),
            name: `NFT #${tokenId}`,
            description: '',
            imageUrl: '',
          };
        })
      );

      setOwnedNFTs(nfts);
    } catch (error) {
      console.error('Error fetching owned NFTs:', error);
      toast({
        title: "Error Loading NFTs",
        description: "Failed to load your NFTs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOwned(false);
    }
  };

  const decodeURIResult = (hexString: string): string => {
    // Remove 0x prefix
    const hex = hexString.slice(2);
    // Skip the first 64 chars (offset pointer) and next 64 chars (length)
    const dataHex = hex.slice(128);
    // Convert hex to string
    let str = '';
    for (let i = 0; i < dataHex.length; i += 2) {
      const charCode = parseInt(dataHex.substr(i, 2), 16);
      if (charCode !== 0) str += String.fromCharCode(charCode);
    }
    return str;
  };

  const handleListSuccess = () => {
    fetchListings();
    if (refetchTokens) {
      refetchTokens();
    }
  };

  const fetchListings = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Create nft_listings table if needed
      // Database query disabled until table is created
      const data = [];

      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Error Loading NFTs",
        description: error instanceof Error ? error.message : "Failed to load NFT listings. Please try again.",
        variant: "destructive",
      });
      // Set empty array so UI doesn't break
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (listing) =>
          listing.name?.toLowerCase().includes(term) ||
          listing.description?.toLowerCase().includes(term) ||
          listing.seller?.username?.toLowerCase().includes(term)
      );
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        // Already sorted by listed_at from query
        break;
    }

    setFilteredListings(filtered);
  };

  const myNFTs = filteredListings.filter(
    (listing) => listing.seller_wallet_address?.toLowerCase() === address?.toLowerCase()
  );

  const otherNFTs = filteredListings.filter(
    (listing) => listing.seller_wallet_address?.toLowerCase() !== address?.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Store className="w-8 h-8" />
            <h1 className="text-4xl font-bold">NFT Marketplace</h1>
          </div>
          <p className="text-muted-foreground">
            Buy, sell, and trade unique NFTs from creators with built-in royalties
          </p>
        </div>

        {/* Collection Stats */}
        <div className="mb-8">
          <CollectionStatsCard
            contractAddress={CREATOR_NFT_CONTRACT_ADDRESS}
            collectionName="Creator NFTs"
            chain="arbitrum"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="marketplace">
              <Store className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-nfts">My NFTs</TabsTrigger>
            <TabsTrigger value="mint">
              <Plus className="w-4 h-4 mr-2" />
              Mint
            </TabsTrigger>
          </TabsList>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search NFTs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No NFTs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? 'No NFTs match your search criteria'
                    : 'Be the first to mint and list an NFT!'}
                </p>
                <Button onClick={() => setActiveTab('mint')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Mint Your First NFT
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map((listing) => (
                  <NFTCard
                    key={listing.id}
                    listingId={listing.listing_id}
                    tokenId={listing.token_id}
                    name={listing.name || `NFT #${listing.token_id}`}
                    description={listing.description || 'No description'}
                    imageUrl={listing.image_url}
                    price={listing.price.toString()}
                    paymentTokenSymbol={listing.payment_token_symbol}
                    seller={listing.seller?.username || 'Unknown'}
                    sellerAddress={listing.seller_wallet_address}
                    royaltyPercentage={listing.royalty_percentage || 0}
                    isActive={listing.status === 'active'}
                    isOwnNFT={
                      listing.seller_wallet_address?.toLowerCase() === address?.toLowerCase()
                    }
                    onPurchaseSuccess={fetchListings}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My NFTs Tab */}
          <TabsContent value="my-nfts" className="space-y-6">
            {!address ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-muted-foreground">
                  Please connect your wallet to view your NFTs
                </p>
              </div>
            ) : isLoadingOwned ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : ownedNFTs.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No NFTs Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't minted any NFTs yet
                </p>
                <Button onClick={() => setActiveTab('mint')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Mint Your First NFT
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {ownedNFTs.map((nft) => (
                  <OwnedNFTCard
                    key={nft.tokenId}
                    tokenId={nft.tokenId}
                    name={nft.name}
                    description={nft.description}
                    imageUrl={nft.imageUrl}
                    isListed={listings.some(
                      (l) => l.token_id === nft.tokenId && l.status === 'active'
                    )}
                    onListSuccess={handleListSuccess}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Mint Tab */}
          <TabsContent value="mint">
            <div className="max-w-2xl mx-auto">
              <NFTMint />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
