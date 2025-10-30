import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCollectionStats, CollectionStats as ICollectionStats, getOpenSeaCollectionURL } from '@/lib/opensea';
import { Loader2, TrendingUp, Users, DollarSign, Package, ExternalLink } from 'lucide-react';

interface CollectionStatsProps {
  contractAddress: string;
  collectionSlug?: string;
  chain?: string;
}

export function CollectionStats({ contractAddress, collectionSlug, chain = 'arbitrum' }: CollectionStatsProps) {
  const [stats, setStats] = useState<ICollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [collectionSlug, contractAddress]);

  const fetchStats = async () => {
    if (!collectionSlug) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await getCollectionStats(collectionSlug);
      setStats(data);
    } catch (err) {
      console.error('Error fetching collection stats:', err);
      setError('Failed to load collection stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            OpenSea Collection Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {error || 'No stats available yet'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getOpenSeaCollectionURL(contractAddress, chain), '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on OpenSea
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            OpenSea Collection Stats
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(getOpenSeaCollectionURL(contractAddress, chain), '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Collection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Floor Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Floor Price</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.floor_price > 0 ? (
                <>
                  {stats.floor_price.toFixed(4)} <span className="text-sm text-muted-foreground">{stats.floor_price_symbol}</span>
                </>
              ) : (
                <span className="text-muted-foreground text-base">—</span>
              )}
            </div>
          </div>

          {/* Total Volume */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Volume</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(stats.total_volume)} <span className="text-sm text-muted-foreground">ETH</span>
            </div>
          </div>

          {/* Total Sales */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="w-4 h-4" />
              <span className="text-sm">Total Sales</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(stats.total_sales)}
            </div>
          </div>

          {/* Owners */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">Owners</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(stats.num_owners)}
            </div>
          </div>

          {/* Total Supply */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="w-4 h-4" />
              <span className="text-sm">Total Supply</span>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(stats.total_supply)}
            </div>
          </div>

          {/* Average Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Avg Price</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.average_price > 0 ? (
                <>
                  {stats.average_price.toFixed(4)} <span className="text-sm text-muted-foreground">ETH</span>
                </>
              ) : (
                <span className="text-muted-foreground text-base">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Market Cap */}
        {stats.market_cap > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Market Cap</span>
              <Badge variant="secondary" className="text-lg">
                {formatNumber(stats.market_cap)} ETH
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
