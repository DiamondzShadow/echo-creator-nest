import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, DollarSign } from 'lucide-react';
import { 
  getBestListingsByCollection, 
  ListingsResponse,
  Listing 
} from '@/lib/opensea';

interface NFTListingsPanelProps {
  collectionSlug: string;
  limit?: number;
}

export function NFTListingsPanel({ 
  collectionSlug, 
  limit = 20 
}: NFTListingsPanelProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadListings();
  }, [collectionSlug]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const response: ListingsResponse = await getBestListingsByCollection(
        collectionSlug,
        limit
      );
      setListings(response.listings);
      setNextCursor(response.next);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceWei: string, decimals: number = 18): string => {
    try {
      const price = Number(priceWei) / Math.pow(10, decimals);
      return price.toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No active listings found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Active Listings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {listings.map((listing, index) => (
            <div
              key={listing.order_hash || index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <div className="font-medium">
                    {formatPrice(listing.current_price)} ETH
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {listing.maker?.address 
                      ? `${listing.maker.address.slice(0, 6)}...${listing.maker.address.slice(-4)}`
                      : 'Unknown'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {listing.order_type}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {formatTimestamp(listing.listing_time)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Open OpenSea to view/buy
                    window.open(`https://opensea.io`, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {nextCursor && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadListings}
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
