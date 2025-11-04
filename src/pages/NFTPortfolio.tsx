import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, 
  ExternalLink, 
  Search, 
  Loader2, 
  Image as ImageIcon,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { 
  getNFTsByWallet, 
  getOpenSeaURL,
  WalletNFT,
  CHAIN_MAP
} from '@/lib/opensea';
import { useToast } from '@/hooks/use-toast';

export default function NFTPortfolio() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  
  const [nfts, setNfts] = useState<WalletNFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<WalletNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (address && isConnected) {
      loadNFTs(address);
    }
  }, [address, isConnected]);

  useEffect(() => {
    filterNFTs();
  }, [nfts, searchTerm]);

  const loadNFTs = async (walletAddress: string) => {
    setIsLoading(true);
    try {
      console.log('Loading NFTs for address:', walletAddress, 'on chain:', selectedChain || 'all chains');
      const data = await getNFTsByWallet(walletAddress, selectedChain, 200);
      console.log('Received NFT data:', data);
      setNfts(data);
      
      toast({
        title: "NFTs Loaded",
        description: `Found ${data.length} NFTs in ${selectedChain || 'all chains'}`,
      });
    } catch (error) {
      console.error('Error loading NFTs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load NFTs from OpenSea",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterNFTs = () => {
    if (!searchTerm) {
      setFilteredNfts(nfts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = nfts.filter(
      (nft) =>
        nft.name?.toLowerCase().includes(term) ||
        nft.collection?.toLowerCase().includes(term) ||
        nft.description?.toLowerCase().includes(term)
    );
    setFilteredNfts(filtered);
  };

  const handleSearchWallet = () => {
    if (customAddress) {
      loadNFTs(customAddress);
    }
  };

  const groupByCollection = () => {
    const collections = new Map<string, WalletNFT[]>();
    filteredNfts.forEach((nft) => {
      const collection = nft.collection || 'Unknown';
      if (!collections.has(collection)) {
        collections.set(collection, []);
      }
      collections.get(collection)!.push(nft);
    });
    return collections;
  };

  const collectionGroups = groupByCollection();
  const totalValue = nfts.length; // In a real implementation, calculate actual USD value

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">NFT Portfolio</h1>
          </div>
          <p className="text-muted-foreground">
            View your complete NFT collection from OpenSea across all blockchains
          </p>
        </div>

        {/* Wallet Connection / Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by wallet address (0x...)"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedChain || 'all'} onValueChange={(value) => setSelectedChain(value === 'all' ? undefined : value)}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chains</SelectItem>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="optimism">Optimism</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="avalanche">Avalanche</SelectItem>
                    <SelectItem value="bsc">BSC</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearchWallet} disabled={!customAddress}>
                  <Search className="w-4 h-4 mr-2" />
                  Search Wallet
                </Button>
              </div>
            </div>
            
            {address && isConnected && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="w-4 h-4" />
                <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => loadNFTs(address)}
                  className="p-0 h-auto"
                >
                  Refresh
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {nfts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Total NFTs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{nfts.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Collections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{collectionGroups.size}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Portfolio Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalValue}</div>
                <p className="text-xs text-muted-foreground mt-1">Unique assets</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Bar */}
        {nfts.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search NFTs by name or collection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isConnected && !customAddress ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-4">
                Connect your wallet to view your NFT portfolio from OpenSea
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading NFTs from OpenSea...</span>
          </div>
        ) : nfts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No NFTs Found</h3>
              <p className="text-muted-foreground">
                This wallet doesn't have any NFTs on OpenSea
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="grid" className="space-y-6">
            <TabsList>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="collections">By Collection</TabsTrigger>
            </TabsList>

            {/* Grid View */}
            <TabsContent value="grid">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNfts.map((nft) => (
                  <Card key={`${nft.contract}-${nft.identifier}`} className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      {nft.image_url ? (
                        <img
                          src={nft.image_url}
                          alt={nft.name || 'NFT'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold truncate mb-1">
                        {nft.name || `#${nft.identifier}`}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mb-3">
                        {nft.collection || 'Unknown Collection'}
                      </p>
                      {nft.quantity > 1 && (
                        <Badge variant="secondary" className="mb-2">
                          Qty: {nft.quantity}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(nft.opensea_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on OpenSea
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Collection View */}
            <TabsContent value="collections">
              <div className="space-y-6">
                {Array.from(collectionGroups.entries()).map(([collection, items]) => (
                  <Card key={collection}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{collection}</span>
                        <Badge>{items.length} items</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {items.slice(0, 12).map((nft) => (
                          <div
                            key={`${nft.contract}-${nft.identifier}`}
                            className="cursor-pointer group"
                            onClick={() => window.open(nft.opensea_url, '_blank')}
                          >
                            <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
                              {nft.image_url ? (
                                <img
                                  src={nft.image_url}
                                  alt={nft.name || 'NFT'}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mt-1 truncate">
                              {nft.name || `#${nft.identifier}`}
                            </p>
                          </div>
                        ))}
                      </div>
                      {items.length > 12 && (
                        <Button variant="link" className="mt-4 w-full">
                          View all {items.length} items
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
