import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { 
  getEventsByCollection, 
  EventsResponse, 
  AssetEvent,
  EventType 
} from '@/lib/opensea';

interface NFTEventsFeedProps {
  collectionSlug: string;
  eventTypes?: EventType[];
  limit?: number;
}

export function NFTEventsFeed({ 
  collectionSlug, 
  eventTypes = ['sale', 'transfer'],
  limit = 20 
}: NFTEventsFeedProps) {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [collectionSlug]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response: EventsResponse = await getEventsByCollection(collectionSlug, {
        event_type: eventTypes,
        limit,
      });
      setEvents(response.asset_events);
      setNextCursor(response.next);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const response: EventsResponse = await getEventsByCollection(collectionSlug, {
        event_type: eventTypes,
        limit,
        next: nextCursor,
      });
      setEvents(prev => [...prev, ...response.asset_events]);
      setNextCursor(response.next);
    } catch (error) {
      console.error('Error loading more events:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const getEventBadgeColor = (type: EventType): string => {
    switch (type) {
      case 'sale':
        return 'bg-green-500';
      case 'transfer':
        return 'bg-blue-500';
      case 'order':
        return 'bg-purple-500';
      case 'cancel':
        return 'bg-red-500';
      case 'redemption':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'sale':
        return <TrendingUp className="h-4 w-4" />;
      case 'transfer':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
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

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No events found for this collection.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={`${event.event_timestamp}-${index}`}
              className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0">
                {event.nft?.image_url ? (
                  <img
                    src={event.nft.image_url}
                    alt={event.nft.name || 'NFT'}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getEventBadgeColor(event.event_type)}>
                    <span className="mr-1">{getEventIcon(event.event_type)}</span>
                    {event.event_type.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatTimestamp(event.event_timestamp)}
                  </span>
                </div>
                
                <div className="font-medium truncate">
                  {event.nft?.name || `#${event.nft?.identifier}`}
                </div>
                
                {event.maker && (
                  <div className="text-sm text-muted-foreground truncate">
                    by {event.maker.slice(0, 6)}...{event.maker.slice(-4)}
                  </div>
                )}
              </div>
              
              {event.nft?.opensea_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(event.nft?.opensea_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {nextCursor && (
          <div className="mt-6 text-center">
            <Button
              onClick={loadMore}
              disabled={loadingMore}
              variant="outline"
              className="w-full"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
