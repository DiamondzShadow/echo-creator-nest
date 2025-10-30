import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { NFTCard } from '@/components/NFTCard';
import { NFTMint } from '@/components/NFTMint';
import { CollectionStatsCard } from '@/components/CollectionStatsCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Store, Plus } from 'lucide-react';
import { CREATOR_NFT_CONTRACT_ADDRESS } from '@/lib/web3-config';

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
  
  const { address } = useAccount();
  const { toast } = useToast();

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, sortBy]);

  const fetchListings = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('nft_listings')
        .select(`
          *,
          seller:profiles!seller_id (
            username
          )
        `)
        .eq('status', 'active')
        .order('listed_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Transform the data to handle the join structure
      const transformedData = (data || []).map((listing: any) => ({
        ...listing,
        seller: listing.seller && Array.isArray(listing.seller) && listing.seller.length > 0
          ? listing.seller[0]
          : listing.seller || null
      }));

      setListings(transformedData);
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
                <p className="text-muted-foreground">
                  Please connect your wallet to view your NFTs
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : myNFTs.length === 0 ? (
              <div className="text-center py-12">
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
                {myNFTs.map((listing) => (
                  <NFTCard
                    key={listing.id}
                    listingId={listing.listing_id}
                    tokenId={listing.token_id}
                    name={listing.name || `NFT #${listing.token_id}`}
                    description={listing.description || 'No description'}
                    imageUrl={listing.image_url}
                    price={listing.price.toString()}
                    paymentTokenSymbol={listing.payment_token_symbol}
                    seller={listing.seller?.username || 'You'}
                    sellerAddress={listing.seller_wallet_address}
                    royaltyPercentage={listing.royalty_percentage || 0}
                    isActive={listing.status === 'active'}
                    isOwnNFT={true}
                    onPurchaseSuccess={fetchListings}
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
