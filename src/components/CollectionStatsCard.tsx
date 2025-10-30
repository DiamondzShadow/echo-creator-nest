import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3,
  Loader2 
} from 'lucide-react';
import { 
  getCollectionStats, 
  getOpenSeaCollectionURL,
  CollectionStats 
} from '@/lib/opensea';

interface CollectionStatsCardProps {
  contractAddress: string;
  collectionName?: string;
  chain?: string;
}

export function CollectionStatsCard({ 
  contractAddress, 
  collectionName = "Collection",
  chain = "arbitrum" 
}: CollectionStatsCardProps) {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [contractAddress]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // For OpenSea API v2, we need the collection slug
      // In a production app, you'd need to map contract addresses to slugs
      // For now, we'll show a message about needing the collection slug
      setError('Collection slug needed for full stats');
      
      // Mock data for demonstration
      setStats({
        total_volume: 0,
        total_sales: 0,
        total_supply: 0,
        num_owners: 0,
        average_price: 0,
        market_cap: 0,
        floor_price: 0,
        floor_price_symbol: 'ETH',
      });
    } catch (err) {
      console.error('Error loading collection stats:', err);
      setError('Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  const openSeaUrl = getOpenSeaCollectionURL(contractAddress, chain);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading collection stats...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {collectionName} Stats
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(openSeaUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            OpenSea
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => window.open(openSeaUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Collection on OpenSea
            </Button>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                Floor Price
              </div>
              <div className="text-2xl font-bold">
                {stats.floor_price > 0 
                  ? `${stats.floor_price.toFixed(4)} ${stats.floor_price_symbol}`
                  : 'N/A'
                }
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                Total Volume
              </div>
              <div className="text-2xl font-bold">
                {stats.total_volume > 0 
                  ? `${(stats.total_volume / 1000).toFixed(1)}K`
                  : '0'
                }
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Owners
              </div>
              <div className="text-2xl font-bold">
                {stats.num_owners || 0}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                Total Sales
              </div>
              <div className="text-2xl font-bold">
                {stats.total_sales || 0}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                Avg Price
              </div>
              <div className="text-2xl font-bold">
                {stats.average_price > 0 
                  ? `${stats.average_price.toFixed(4)}`
                  : 'N/A'
                }
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="w-4 h-4" />
                Total Supply
              </div>
              <div className="text-2xl font-bold">
                {stats.total_supply || 0}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Contract:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </code>
            <Badge variant="outline">{chain}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
