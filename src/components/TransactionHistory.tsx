import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Loader2, RefreshCw, Filter, X, CalendarIcon } from 'lucide-react';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

interface Tip {
  id: string;
  amount: string;
  token_symbol: string;
  network: string;
  transaction_hash: string;
  created_at: string;
  from_user_id: string | null;
  to_user_id: string;
  from_wallet_address: string;
  to_wallet_address: string;
}

interface TransactionHistoryProps {
  userId: string;
}

export const TransactionHistory = ({ userId }: TransactionHistoryProps) => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const fetchTips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching tips:', error);
    } else {
      setTips(data || []);
    }
    setLoading(false);
  };

  const filteredTips = tips.filter((tip) => {
    // Network filter
    if (networkFilter !== 'all') {
      if (networkFilter === 'evm') {
        const evmNetworks = ['ethereum', 'polygon', 'base', 'arbitrum', 'optimism'];
        if (!evmNetworks.includes(tip.network.toLowerCase())) return false;
      } else if (tip.network.toLowerCase() !== networkFilter) {
        return false;
      }
    }

    // Direction filter
    if (directionFilter !== 'all') {
      const isReceived = tip.to_user_id === userId;
      if (directionFilter === 'received' && !isReceived) return false;
      if (directionFilter === 'sent' && isReceived) return false;
    }

    // Date range filter
    if (startDate) {
      const tipDate = new Date(tip.created_at);
      if (isBefore(tipDate, startOfDay(startDate))) return false;
    }
    if (endDate) {
      const tipDate = new Date(tip.created_at);
      if (isAfter(tipDate, endOfDay(endDate))) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setNetworkFilter('all');
    setDirectionFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = networkFilter !== 'all' || directionFilter !== 'all' || startDate || endDate;

  useEffect(() => {
    fetchTips();

    // Set up realtime subscription
    const channel = supabase
      .channel('tips-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tips',
          filter: `or(from_user_id=eq.${userId},to_user_id=eq.${userId})`,
        },
        () => {
          fetchTips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getBlockExplorerUrl = (network: string, hash: string) => {
    const explorers: Record<string, string> = {
      ethereum: `https://etherscan.io/tx/${hash}`,
      polygon: `https://polygonscan.com/tx/${hash}`,
      base: `https://basescan.org/tx/${hash}`,
      arbitrum: `https://arbiscan.io/tx/${hash}`,
      optimism: `https://optimistic.etherscan.io/tx/${hash}`,
      solana: `https://solscan.io/tx/${hash}`,
      xrp: `https://xrpscan.com/tx/${hash}`,
    };
    return explorers[network.toLowerCase()] || '#';
  };

  const getNetworkColor = (network: string) => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      polygon: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      base: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      arbitrum: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      optimism: 'bg-red-500/20 text-red-400 border-red-500/30',
      solana: 'bg-green-500/20 text-green-400 border-green-500/30',
      xrp: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return colors[network.toLowerCase()] || 'bg-secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent tips across all chains</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent tips across all chains</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={fetchTips}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Network</label>
                <Select value={networkFilter} onValueChange={setNetworkFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Networks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Networks</SelectItem>
                    <SelectItem value="evm">EVM (ETH/MATIC)</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="xrp">XRP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Direction</label>
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Transactions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {tips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions yet
          </div>
        ) : filteredTips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions match your filters
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredTips.map((tip) => {
                const isReceived = tip.to_user_id === userId;
                const isXRP = tip.network.toLowerCase() === 'xrp';
                
                return (
                  <div
                    key={tip.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isReceived ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                        {isReceived ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {isReceived ? 'Received' : 'Sent'}
                          </span>
                          <Badge variant="outline" className={getNetworkColor(tip.network)}>
                            {tip.network.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(tip.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold">
                          {isReceived ? '+' : '-'}{tip.amount} {tip.token_symbol}
                        </div>
                        {isXRP && (
                          <div className="text-xs text-muted-foreground">
                            {tip.from_wallet_address.slice(0, 6)}...{tip.from_wallet_address.slice(-4)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        className="h-8 w-8"
                      >
                        <a
                          href={getBlockExplorerUrl(tip.network, tip.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
